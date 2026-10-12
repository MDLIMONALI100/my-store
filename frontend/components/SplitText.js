// Headline whose words slide up one after another when it scrolls into view.
// Use "\n" in text for a line break. Server component: it only draws the markup;
// the animation is CSS (.split in globals.css) triggered by RevealObserver.
import { Fragment } from "react";

export default function SplitText({ text, as: Tag = "h2", className = "", delay = 0, outlineLast = false, ...rest }) {
  const lines = String(text).split("\n");
  let n = 0;
  return (
    <Tag
      className={`split ${className}`}
      data-reveal="text"
      style={{ "--base": `${delay}ms` }}
      aria-label={lines.join(" ")}
      {...rest}
    >
      {lines.map((line, li) => (
        <span className={`line ${outlineLast && li === lines.length - 1 ? "outline" : ""}`} key={li} aria-hidden="true">
          {line.split(" ").map((word, wi) => (
            <Fragment key={wi}>
              <span className="w">
                <span style={{ "--i": n++ }}>{word}</span>
              </span>{" "}
            </Fragment>
          ))}
        </span>
      ))}
    </Tag>
  );
}
