import { QRCodeSVG } from "qrcode.react";

interface QRCodeProps {
  value: string;
  size?: number;
  title?: string;
}

export default function QRCode({ value, size = 256, title }: QRCodeProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg inline-block">
      {title && (
        <p className="text-gray-600 text-center mb-4 font-medium">{title}</p>
      )}
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin
        bgColor="#ffffff"
        fgColor="#1a1a2e"
      />
      <p className="text-xs text-gray-400 text-center mt-4 max-w-[256px] break-all">
        {value}
      </p>
    </div>
  );
}
