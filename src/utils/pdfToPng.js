import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function pdfToPng(buffer, outputPath) {
  // Simpan PDF sementara
  const tempPdf = `uploads/pdf/temp_${Date.now()}.pdf`;
  fs.writeFileSync(tempPdf, buffer);

  // Output folder & prefix
  const outDir = path.dirname(outputPath);
  const outPrefix = path.basename(outputPath, ".png");

  // Perintah Poppler: convert PDF → PNG
  const cmd = `pdftoppm -png ${tempPdf} ${outDir}/${outPrefix}`;

  await execAsync(cmd);

  // Hasil otomatis: outPrefix-1.png
  const generated = `${outDir}/${outPrefix}-1.png`;

  // Rename ke nama yang kita tentukan
  fs.renameSync(generated, outputPath);

  // Hapus PDF sementara
  fs.unlinkSync(tempPdf);

  return outputPath;
}
