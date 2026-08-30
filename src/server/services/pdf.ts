import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getConfig } from "../config";

export async function renderReportPdf(report: {
  publicId: string;
  title: string;
  version: number;
  status: string;
  contentHash: string | null;
  certificationText: string;
  payload: unknown;
}): Promise<Buffer> {
  const verifyUrl = `${getConfig().baseUrl}/verify/${report.publicId}`;
  const qr = await QRCode.toDataURL(verifyUrl);
  const doc = new PDFDocument({ size: "LETTER", margin: 54 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(22).text("MotorLedger");
  doc.moveDown(0.3);
  doc.fontSize(16).text(report.title);
  doc.moveDown();
  doc.fontSize(11).text(`Report identifier: ${report.publicId}`);
  doc.text(`Version: ${report.version}`);
  doc.text(`Status: ${report.status}`);
  doc.text(`Content hash: ${report.contentHash ?? "not finalized"}`);
  doc.text(`Verification: ${verifyUrl}`);
  doc.moveDown();
  const qrImage = qr.replace(/^data:image\/png;base64,/, "");
  doc.image(Buffer.from(qrImage, "base64"), { width: 96 });
  doc.moveDown();
  doc.fontSize(12).text("Certification (draft unless independently signed)");
  doc.moveDown(0.4);
  doc.fontSize(9).text(report.certificationText, { align: "left" });
  doc.moveDown();
  doc.fontSize(12).text("Preserved payload");
  doc.moveDown(0.3);
  doc.fontSize(8).text(JSON.stringify(report.payload, null, 2).slice(0, 6000));
  doc.end();
  return done;
}
