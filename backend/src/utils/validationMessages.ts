import type { ValidationErrorItem } from "joi";

type FriendlyValidationMessage = {
  field: string;
  message: string;
  passwordRule?: string;
};

const fieldLabels: Record<string, string> = {
  name: "Name",
  email: "Email",
  password: "Password"
};

export function formatJoiValidationError(details: ValidationErrorItem[]) {
  const messages = details.map(toFriendlyMessage);
  const passwordMessages = messages.filter((message) => message.field === "password");
  const otherMessages = messages.filter((message) => message.field !== "password");
  const output: string[] = [];

  output.push(...otherMessages.map((message) => message.message));

  if (passwordMessages.length === 1) {
    output.push(passwordMessages[0].message);
  }

  if (passwordMessages.length > 1) {
    output.push("Password must:");
    output.push(
      ...passwordMessages.map((message) => `• ${message.passwordRule ?? stripPasswordPrefix(message.message)}`)
    );
  }

  return [...new Set(output)].join("\n");
}

function toFriendlyMessage(detail: ValidationErrorItem): FriendlyValidationMessage {
  const field = String(detail.path[0] ?? detail.context?.key ?? "field");
  const label = fieldLabels[field] ?? toTitleCase(field);

  if (field === "email" && detail.type === "string.email") {
    return { field, message: "Please enter a valid email address." };
  }

  if ((detail.type === "any.required" || detail.type === "string.empty") && field === "name") {
    return { field, message: "Name is required." };
  }

  if (detail.type === "any.required" || detail.type === "string.empty") {
    return { field, message: `${label} is required.` };
  }

  if (field === "password") {
    return passwordMessage(detail);
  }

  if (detail.type === "string.min") {
    return {
      field,
      message: `${label} must be at least ${detail.context?.limit} characters long.`
    };
  }

  if (detail.type === "string.max") {
    return {
      field,
      message: `${label} must be at most ${detail.context?.limit} characters long.`
    };
  }

  if (detail.type === "number.positive") {
    return { field, message: `${label} must be greater than zero.` };
  }

  if (detail.type === "number.min") {
    return { field, message: `${label} must be zero or greater.` };
  }

  return { field, message: `${label} is invalid.` };
}

function passwordMessage(detail: ValidationErrorItem): FriendlyValidationMessage {
  if (detail.type === "string.min") {
    return {
      field: "password",
      message: "Password must be at least 8 characters long.",
      passwordRule: "Be at least 8 characters long"
    };
  }

  if (detail.type === "string.max") {
    return {
      field: "password",
      message: "Password must be at most 72 characters long.",
      passwordRule: "Be at most 72 characters long"
    };
  }

  if (detail.type === "string.pattern.name") {
    const patternName = String(detail.context?.name ?? "");

    if (patternName === "uppercase letter") {
      return {
        field: "password",
        message: "Password must contain at least one uppercase letter.",
        passwordRule: "Contain at least one uppercase letter"
      };
    }

    if (patternName === "lowercase letter") {
      return {
        field: "password",
        message: "Password must contain at least one lowercase letter.",
        passwordRule: "Contain at least one lowercase letter"
      };
    }

    if (patternName === "number") {
      return {
        field: "password",
        message: "Password must contain at least one number.",
        passwordRule: "Contain at least one number"
      };
    }
  }

  if (detail.type === "any.required" || detail.type === "string.empty") {
    return {
      field: "password",
      message: "Password is required.",
      passwordRule: "Be provided"
    };
  }

  return { field: "password", message: "Password is invalid.", passwordRule: "Use a valid password" };
}

function stripPasswordPrefix(message: string) {
  return message.replace(/^Password must\s*/i, "").replace(/\.$/, "");
}

function toTitleCase(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}
