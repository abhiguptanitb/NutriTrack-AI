import { AlertCircle } from "lucide-react";

type AuthErrorAlertProps = {
  message: string;
};

export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const [title, ...items] = lines;
  const bulletItems = items.filter((line) => line.startsWith("•")).map((line) => line.replace(/^•\s*/, ""));
  const plainItems = items.filter((line) => !line.startsWith("•"));

  return (
    <div
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
      role="alert"
    >
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-2">
          <p className="font-medium leading-5">{title}</p>
          {bulletItems.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {bulletItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {plainItems.length > 0 ? (
            <ul className="space-y-1">
              {plainItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
