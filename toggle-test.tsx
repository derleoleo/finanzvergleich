import { createRoot } from "react-dom/client";
import { useState } from "react";
import "@/index.css";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
function D() {
  const [v, setV] = useState<"a" | "b">("a");
  return (<div className="p-8"><SegmentedToggle value={v} onChange={setV} ariaLabel="Test"
    options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} />
    <div id="stand" className="mt-4">{v}</div></div>);
}
createRoot(document.getElementById("root")!).render(<D />);
