import React from "react";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`border rounded-md px-3 py-2 text-sm w-full ${props.className ?? ""}`} />;
}
