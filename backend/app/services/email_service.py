import logging
from email.message import EmailMessage

from app.core.extended_settings import extended_settings

logger = logging.getLogger("taskflow.email")


def _html_shell(title: str, body: str) -> str:
    return f"""<!doctype html>
<html>
  <body style="margin:0;background:#061018;color:#e8f2f7;font-family:Outfit,Segoe UI,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#0a1622;border:1px solid rgba(148,201,224,0.14);border-radius:16px;padding:32px;">
            <tr><td style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#3ec4f0;">TaskFlow AI</td></tr>
            <tr><td style="padding-top:16px;font-size:24px;font-weight:700;color:#ffffff;">{title}</td></tr>
            <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#8fa6b8;">{body}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def welcome_email(full_name: str, company_name: str) -> tuple[str, str]:
    subject = f"Welcome to {company_name} on TaskFlow AI"
    body = _html_shell(
        f"Welcome, {full_name}",
        f"Your workspace <strong style='color:#e8f2f7'>{company_name}</strong> is ready. "
        f"Sign in at {extended_settings.frontend_url}/login to start managing projects.",
    )
    return subject, body


def project_created_email(full_name: str, project_name: str, company_name: str) -> tuple[str, str]:
    subject = f"{project_name} was created in {company_name}"
    body = _html_shell(
        "New project",
        f"Hi {full_name}, the project <strong style='color:#e8f2f7'>{project_name}</strong> "
        f"is now live in <strong style='color:#e8f2f7'>{company_name}</strong>. "
        f"Open the board at {extended_settings.frontend_url}/app/board",
    )
    return subject, body


def invite_email(company_name: str, role: str, invite_url: str) -> tuple[str, str]:
    subject = f"You're invited to {company_name} on TaskFlow AI"
    body = _html_shell(
        "Join your team",
        f"You've been invited to <strong style='color:#e8f2f7'>{company_name}</strong> as "
        f"<strong style='color:#e8f2f7'>{role}</strong>. "
        f"<p style='margin-top:20px'><a href='{invite_url}' "
        f"style='background:#3ec4f0;color:#041018;text-decoration:none;padding:12px 18px;"
        f"border-radius:10px;font-weight:600;'>Accept invite</a></p>"
        f"<p style='margin-top:16px;font-size:13px'>Or paste this link: {invite_url}</p>",
    )
    return subject, body


def send_email(to_email: str, subject: str, html_body: str) -> None:
    if not extended_settings.smtp_host or not extended_settings.smtp_from_email:
        logger.warning("SMTP is not configured; skipping email to %s", to_email)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = (
        f"{extended_settings.smtp_from_name} <{extended_settings.smtp_from_email}>"
    )
    message["To"] = to_email
    message.set_content("This email requires an HTML-capable client.")
    message.add_alternative(html_body, subtype="html")

    try:
        import smtplib

        if extended_settings.smtp_use_ssl:
            smtp_factory = smtplib.SMTP_SSL
        else:
            smtp_factory = smtplib.SMTP

        with smtp_factory(
            extended_settings.smtp_host, extended_settings.smtp_port, timeout=20
        ) as smtp:
            if extended_settings.smtp_use_tls and not extended_settings.smtp_use_ssl:
                smtp.starttls()
            if extended_settings.smtp_user and extended_settings.smtp_password:
                smtp.login(extended_settings.smtp_user, extended_settings.smtp_password)
            smtp.send_message(message)
        logger.info("Email sent to %s (%s)", to_email, subject)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
