import { useState } from "react";

export default function App() {
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    const response = await fetch("/.netlify/functions/generate", {
      method: "POST",
      body: JSON.stringify({
        resume: JSON.parse(resumeInput),
        requirements: jdInput.split("\n")
      })
    });

    const data = await response.json();

    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>NarrativeOS</h1>

      <h3>Resume JSON</h3>
      <textarea
        rows={10}
        style={{ width: "100%" }}
        value={resumeInput}
        onChange={(e) => setResumeInput(e.target.value)}
      />

      <h3>Job Description (1 requirement per line)</h3>
      <textarea
        rows={6}
        style={{ width: "100%" }}
        value={jdInput}
        onChange={(e) => setJdInput(e.target.value)}
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate Resume"}
      </button>

      {result && (
        <div style={{ marginTop: 30 }}>
          <h2>{result.header}</h2>
          <p>{result.summary}</p>

          <h3>Skills</h3>
          <ul>
            {result.skills.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h3>Experience</h3>
          {result.roles.map((role, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <strong>
                {role.title} — {role.company}
              </strong>
              <div>{role.dates}</div>
              <ul>
                {role.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}

          <h3>Education</h3>
          <p>{result.education}</p>
        </div>
      )}
    </div>
  );
}
