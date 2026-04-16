import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  html: string;
  className?: string;
}

const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "a", "br", "span"],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  FORCE_BODY: true,
};

function sanitize(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

export function RichTextDisplay({ html, className = "" }: RichTextDisplayProps) {
  if (!html?.trim()) return null;
  const clean = sanitize(html);
  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
