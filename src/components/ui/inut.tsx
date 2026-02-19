import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`border rounded-md px-3 py-2 text-sm w-full ${props.className ?? ""}`} />;
}
