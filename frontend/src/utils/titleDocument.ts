import type { JSONContent } from "@tiptap/core";

export type TitleDocument = JSONContent;

export function createDefaultTitleDocument(): TitleDocument {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: {
          textAlign: "center",
        },
        content: [
          {
            type: "text",
            text: "RANKING ",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  color: "#a78bfa",
                },
              },
            ],
          },
          {
            type: "text",
            text: "THE BEST MOMENTS",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  color: "#ffffff",
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
