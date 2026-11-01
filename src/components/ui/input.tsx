import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      // `min-w-0` trotz `w-full`: Ein Eingabefeld bringt eine eigene
      // Wunschbreite mit (rund 170 px), und die gilt als Mindestbreite seines
      // Raster- oder Flex-Feldes. In einem zweispaltigen Raster auf 320 px
      // reichte das, um die ganze Karte aufzudrücken.
      className={`border rounded-md px-3 py-2 text-sm w-full min-w-0 ${props.className ?? ""}`}
    />
  );
}
