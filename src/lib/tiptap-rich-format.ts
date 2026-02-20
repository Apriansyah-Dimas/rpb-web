import { Extension } from "@tiptap/core";

const safeValue = (value?: string) => (value && value.trim().length > 0 ? value : null);

export const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              const value = safeValue(attributes.fontSize);
              if (!value) {
                return {};
              }

              return { style: `font-size: ${value}` };
            },
          },
        },
      },
    ];
  },
});

export const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              const value = safeValue(attributes.lineHeight);
              if (!value) {
                return {};
              }

              return { style: `line-height: ${value}` };
            },
          },
        },
      },
    ];
  },
});

export const TextTransform = Extension.create({
  name: "textTransform",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          textTransform: {
            default: null,
            parseHTML: (element) => element.style.textTransform || null,
            renderHTML: (attributes) => {
              const value = safeValue(attributes.textTransform);
              if (!value) {
                return {};
              }

              return { style: `text-transform: ${value}` };
            },
          },
        },
      },
    ];
  },
});
