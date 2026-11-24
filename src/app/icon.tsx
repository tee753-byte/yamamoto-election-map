import { ImageResponse } from "next/og";
import { BaseMark } from "@/features/shared/components/base-mark";
import { BRAND_COLOR } from "@/lib/constants/app";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        background: BRAND_COLOR,
        borderRadius: 112,
      }}
    >
      <BaseMark size={310} />
    </div>,
    size,
  );
}
