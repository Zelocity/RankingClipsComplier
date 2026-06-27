import type { JSONContent } from "@tiptap/core";
import type { TitleDocument } from "../../utils/titleDocument";

type RichTitleOverlayProps = {
  document: TitleDocument;
};

function getTextColor(node: JSONContent): string {
  const textStyleMark = node.marks?.find(
    (mark) =>
      mark.type === "textStyle" && typeof mark.attrs?.color === "string",
  );

  return typeof textStyleMark?.attrs?.color === "string"
    ? textStyleMark.attrs.color
    : "#ffffff";
}

function hasMark(node: JSONContent, markName: string): boolean {
  return node.marks?.some((mark) => mark.type === markName) ?? false;
}

function getTextAlign(paragraph: JSONContent) {
  const alignment = paragraph.attrs?.textAlign;

  if (alignment === "left" || alignment === "center" || alignment === "right") {
    return alignment;
  }

  return "center";
}

function RichTitleOverlay({ document }: RichTitleOverlayProps) {
  const paragraphs = (document.content ?? []).filter(
    (node) => node.type === "paragraph",
  );

  return (
    <div className="preview-outline text-xl font-black uppercase leading-tight">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const paragraphContent = paragraph.content ?? [];

        return (
          <p
            key={paragraphIndex}
            style={{ textAlign: getTextAlign(paragraph) }}
            className="m-0"
          >
            {paragraphContent.length === 0 && <br />}

            {paragraphContent.map((node, nodeIndex) => {
              if (node.type === "hardBreak") {
                return <br key={nodeIndex} />;
              }

              if (node.type !== "text") {
                return null;
              }

              return (
                <span
                  key={nodeIndex}
                  style={{
                    color: getTextColor(node),
                    fontWeight: hasMark(node, "bold") ? 900 : undefined,
                    fontStyle: hasMark(node, "italic") ? "italic" : undefined,
                  }}
                >
                  {node.text}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

export default RichTitleOverlay;
