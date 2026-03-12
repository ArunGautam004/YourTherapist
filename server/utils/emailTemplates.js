// Shared styles
const wrap = `font-family:'Inter',Arial,sans-serif;max-width:520px;margin:0 auto;background:#f0f4f3;padding:16px;`;
const card = `background:#ffffff;border-radius:16px;padding:32px;`;
const header = `text-align:center;margin-bottom:24px;`;
const table = `background:#f0fdf4;border-radius:12px;padding:20px;margin:16px 0;width:100%;border-collapse:collapse;`;
const tdLabel = `padding:7px 0;font-size:14px;color:#999;width:110px;`;
const tdValue = `padding:7px 0;font-size:14px;color:#222;font-weight:600;`;
const footer = `text-align:center;color:#bbb;font-size:11px;padding:20px 0 4px;`;
const btn = `display:inline-block;background:#0d6b5e;color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;`;

function aptTable({ patientName, doctorName, dateStr, time, type, fee }) {
  const doctor = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
  return `
    <table style="${table}">
      <tr><td style="${tdLabel}">Doctor</td><td style="${tdValue}">${doctor}</td></tr>
      <tr><td style="${tdLabel}">Patient</td><td style="${tdValue}">${patientName}</td></tr>
      <tr><td style="${tdLabel}">Date</td><td style="${tdValue}">${dateStr}</td></tr>
      <tr><td style="${tdLabel}">Time</td><td style="${tdValue}">${time}</td></tr>
      <tr><td style="${tdLabel}">Type</td><td style="${tdValue};text-transform:capitalize;">${type}</td></tr>
      ${fee ? `<tr><td style="${tdLabel}">Fee</td><td style="${tdValue}">₹${fee} Paid ✓</td></tr>` : ''}
    </table>`;
}

// ── Sent to PATIENT after successful payment ───────────────────────────────
export function confirmationPatientEmail(apt) {
  return `<div style="${wrap}">
    <div style="${card}">
      <div style="${header}">
        <h2 style="color:#0d6b5e;margin:0;">YourTherapist</h2>
        <p style="color:#888;margin:4px 0 0;">Appointment Confirmed 🎉</p>
      </div>
      <p style="color:#333;font-size:15px;">Hello <strong>${apt.patientName}</strong>,</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">Your appointment is confirmed and payment received. You'll get a reminder email with a joining link <strong>10 minutes before</strong> the session.</p>
      ${aptTable(apt)}
    </div>
    <div style="${footer}">© ${new Date().getFullYear()} YourTherapist</div>
  </div>`;
}

// ── Sent to DOCTOR after a patient books ──────────────────────────────────
export function confirmationDoctorEmail(apt) {
  const doctor = apt.doctorName.startsWith('Dr.') ? apt.doctorName : `Dr. ${apt.doctorName}`;
  return `<div style="${wrap}">
    <div style="${card}">
      <div style="${header}">
        <h2 style="color:#0d6b5e;margin:0;">YourTherapist</h2>
        <p style="color:#888;margin:4px 0 0;">New Appointment Booked 📅</p>
      </div>
      <p style="color:#333;font-size:15px;">Hello <strong>${doctor}</strong>,</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">A new appointment has been successfully booked with you.</p>
      ${aptTable(apt)}
    </div>
    <div style="${footer}">© ${new Date().getFullYear()} YourTherapist</div>
  </div>`;
}

// ── Sent to BOTH 10 min before session — includes join button ─────────────
export function reminderEmail(apt, recipientName, joinUrl) {
  return `<div style="${wrap}">
    <div style="${card}">
      <div style="${header}">
        <h2 style="color:#0d6b5e;margin:0;">YourTherapist</h2>
        <p style="color:#888;margin:4px 0 0;">⏰ Session Starts in 10 Minutes</p>
      </div>
      <p style="color:#333;font-size:15px;">Hello <strong>${recipientName}</strong>,</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">Your therapy session is about to begin. Please join using the button below.</p>
      ${aptTable(apt)}
      <div style="text-align:center;margin:28px 0 16px;">
        <a href="${joinUrl}" style="${btn}">🎥 Join Session Now</a>
      </div>
      <p style="color:#ccc;font-size:12px;text-align:center;">Or copy this link: ${joinUrl}</p>
    </div>
    <div style="${footer}">© ${new Date().getFullYear()} YourTherapist</div>
  </div>`;
}