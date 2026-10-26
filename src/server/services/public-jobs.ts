import "server-only";

import { ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { publicApplicationSchema } from "@/lib/validation";
import type { Json } from "@/types/database.generated";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const resumeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export async function getPublicCareerSite(agencySlug: string) {
  const publicClient = createPublicClient();
  const { data: agency, error: agencyError } = await publicClient
    .from("agencies")
    .select(
      "id,name,slug,contact_email,primary_specialization,logo_path,country_code",
    )
    .eq("slug", agencySlug)
    .eq("status", "active")
    .single();
  if (agencyError || !agency) {
    throw new ApiError(404, "CAREER_SITE_NOT_FOUND", "Career site not found.");
  }
  const { data: jobs, error: jobsError } = await publicClient
    .from("jobs")
    .select(
      "id,title,public_slug,department,location,employment_type,work_arrangement,published_at,positions_required,clients(name)",
    )
    .eq("agency_id", agency.id)
    .eq("status", "open")
    .eq("accepting_applications", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (jobsError) {
    throw new ApiError(
      500,
      "PUBLIC_JOBS_FAILED",
      "Open roles could not be loaded.",
    );
  }
  return { agency, jobs: jobs ?? [] };
}

export async function getPublicJob(agencySlug: string, jobSlug: string) {
  const publicClient = createPublicClient();
  const { data: agency, error: agencyError } = await publicClient
    .from("agencies")
    .select("id,name,slug,primary_specialization,logo_path")
    .eq("slug", agencySlug)
    .eq("status", "active")
    .single();
  if (agencyError || !agency) {
    throw new ApiError(
      404,
      "PUBLIC_JOB_NOT_FOUND",
      "This role is not accepting applications.",
    );
  }
  const { data, error } = await publicClient
    .from("jobs")
    .select(
      "id,agency_id,title,description,department,location,employment_type,work_arrangement,salary_min,salary_max,currency,positions_required,deadline_at,application_form_intro,public_slug,published_at,clients(name,industry),job_requirements(id,label,description,requirement_type,sort_order),job_application_questions(id,label,help_text,question_type,options,is_required,sort_order)",
    )
    .eq("public_slug", jobSlug)
    .eq("agency_id", agency.id)
    .eq("status", "open")
    .eq("accepting_applications", true)
    .not("published_at", "is", null)
    .order("sort_order", { referencedTable: "job_requirements" })
    .order("sort_order", { referencedTable: "job_application_questions" })
    .single();
  if (error || !data) {
    throw new ApiError(
      404,
      "PUBLIC_JOB_NOT_FOUND",
      "This role is not accepting applications.",
    );
  }
  return { ...data, agencies: agency };
}

function parseAnswers(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ApiError(
      422,
      "INVALID_ANSWERS",
      "Screening answers are invalid.",
    );
  }
}

export async function submitPublicApplication(
  agencySlug: string,
  jobSlug: string,
  formData: FormData,
) {
  const job = await getPublicJob(agencySlug, jobSlug);
  const resume = formData.get("resume");
  if (!(resume instanceof File) || resume.size === 0) {
    throw new ApiError(
      422,
      "RESUME_REQUIRED",
      "Attach your resume to continue.",
      {
        resume: ["Attach a PDF or DOCX resume."],
      },
    );
  }
  if (!resumeTypes.has(resume.type) || resume.size > MAX_RESUME_BYTES) {
    throw new ApiError(
      422,
      "INVALID_RESUME",
      "Your resume must be a PDF or DOCX file no larger than 10 MiB.",
      { resume: ["Use a PDF or DOCX file no larger than 10 MiB."] },
    );
  }

  const payload = publicApplicationSchema.parse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    coverNote: formData.get("coverNote") || undefined,
    consent: formData.get("consent"),
    answers: parseAnswers(formData.get("answers")),
  });

  const questionIds = new Set(
    job.job_application_questions.map((question) => question.id),
  );
  const requiredIds = new Set(
    job.job_application_questions
      .filter((question) => question.is_required)
      .map((question) => question.id),
  );
  for (const answer of payload.answers) {
    if (!questionIds.has(answer.questionId)) {
      throw new ApiError(
        422,
        "INVALID_QUESTION",
        "A screening question is no longer available.",
      );
    }
    if (typeof answer.answer === "string" && answer.answer.trim()) {
      requiredIds.delete(answer.questionId);
    }
    if (typeof answer.answer === "boolean")
      requiredIds.delete(answer.questionId);
  }
  if (requiredIds.size) {
    throw new ApiError(
      422,
      "REQUIRED_ANSWERS_MISSING",
      "Answer every required screening question.",
    );
  }

  const admin = createAdminClient();
  const applicationId = crypto.randomUUID();
  const fileName = safeFileName(resume.name) || `resume-${applicationId}.pdf`;
  const storagePath = `${job.agency_id}/${job.id}/${applicationId}/${fileName}`;
  const upload = await admin.storage
    .from("candidate-documents")
    .upload(storagePath, await resume.arrayBuffer(), {
      contentType: resume.type,
      upsert: false,
    });
  if (upload.error) {
    throw new ApiError(
      503,
      "RESUME_UPLOAD_FAILED",
      "Your resume could not be uploaded. Please try again.",
    );
  }

  const { data, error } = await admin.rpc("submit_public_application", {
    p_application_id: applicationId,
    p_agency_id: job.agency_id,
    p_job_id: job.id,
    p_full_name: payload.fullName,
    p_email: payload.email,
    p_phone: payload.phone || "",
    p_linkedin_url: payload.linkedinUrl || "",
    p_cover_note: payload.coverNote || "",
    p_document: {
      fileName: resume.name,
      storagePath,
      contentType: resume.type,
      sizeBytes: resume.size,
    } as Json,
    p_answers: payload.answers.map((answer) => ({
      questionId: answer.questionId,
      answer: answer.answer,
    })) as Json,
  });

  if (error || !data) {
    await admin.storage.from("candidate-documents").remove([storagePath]);
    if (error?.message.includes("applications_job_id_candidate_id_key")) {
      throw new ApiError(
        409,
        "ALREADY_APPLIED",
        "You have already applied for this role.",
      );
    }
    throw new ApiError(
      400,
      "APPLICATION_CREATE_FAILED",
      "Your application could not be submitted.",
    );
  }

  // The intake task was committed with the application. Provider work runs later.
  return { applicationId, confirmationEmailStatus: "queued" };
}
