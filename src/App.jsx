const response = await fetch("/.netlify/functions/generate", {
  method: "POST",
  body: JSON.stringify({
    resume: resumeInput,
    requirements: extractRequirements(jdInput)
  })
});

let data;

try {
  data = await response.json();
} catch {
  throw new Error("Server returned non-JSON (likely timeout)");
}
