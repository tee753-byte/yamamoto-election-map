import { ImageResponse } from "next/og";
import { BaseMark } from "@/features/shared/components/base-mark";
import { BRAND_COLOR } from "@/lib/constants/app";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        borderRadius: 38,
      }}
    >
      <BaseMark size={108} />
    </div>,
    size,
  );
}
