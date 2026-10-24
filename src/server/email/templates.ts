import "server-only";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

export function statusEmail(input: {
  title: string;
  preview: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const action =
    input.actionLabel && input.actionUrl
      ? `<p style="margin:28px 0"><a href="${escapeHtml(input.actionUrl)}" style="background:#5C5AED;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:650">${escapeHtml(input.actionLabel)}</a></p>`
      : "";

  return `<!doctype html><html><body style="margin:0;background:#F6F7FB;color:#17182B;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preview)}</div><div style="max-width:600px;margin:0 auto;padding:36px 20px"><div style="font-size:20px;font-weight:800;margin-bottom:24px">Recruta</div><main style="background:#fff;border:1px solid #E4E5EE;border-radius:16px;padding:32px"><h1 style="font-size:24px;margin:0 0 14px">${escapeHtml(input.title)}</h1><p style="font-size:16px;line-height:1.6;margin:0">${escapeHtml(input.body)}</p>${action}</main><p style="color:#666A7C;font-size:12px;margin-top:20px">This operational email was sent by Recruta.</p></div></body></html>`;
}
