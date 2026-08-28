export type EditablePdfField = {
  id: string;
  label: string;
  pageNumber: number;
  initialValue: string;
  align: "left" | "center";
  multiline?: boolean;
  fontSize: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type EditablePdfPage = {
  pageNumber: number;
  title: string;
  imageSrc: string;
  width: number;
  height: number;
};

export type EditableImageDocument = {
  slug: string;
  title: string;
  description: string;
  sourceHref: string;
  downloadHref: string;
  editedFileName: string;
  pages: EditablePdfPage[];
  fields: EditablePdfField[];
};

const pageWidth = 720;
const pageHeight = 540;
const rowTops = [168, 209.5, 251, 292.5, 334, 375.5];
const luxRows = [
  ["A - FRV", "500", "550"],
  ["B - Chilled", "530", "600"],
  ["C - Checkouts", "650", "700"],
  ["D - Ambient", "520", "690"],
  ["E - BWS", "446", "530"],
  ["F - Shop floor\nGeneral", "560", "680"],
];
const salesFloorRows = [
  ["A - FRV", "19"],
  ["B - Chilled", "19"],
  ["C - Checkouts", "19"],
  ["D - Ambient", "18.7"],
  ["E - BWS", "19.1"],
  ["F - Shop floor\nGeneral", "19.1"],
];
const backOfHouseRows = [["A - BOH", "18"], ["", ""], ["", ""], ["", ""], ["", ""], ["", ""]];

function fieldId(pageNumber: number, rowIndex: number, name: string) {
  return `p${pageNumber}-r${rowIndex + 1}-${name}`;
}

function makeLuxFields(): EditablePdfField[] {
  return luxRows.flatMap(([area, prior, current], rowIndex) => {
    const y = rowTops[rowIndex];
    return [
      {
        id: fieldId(3, rowIndex, "area"),
        label: `Page 3 area ${rowIndex + 1}`,
        pageNumber: 3,
        initialValue: area,
        align: "left",
        multiline: area.includes("\n"),
        fontSize: 10.5,
        rect: { x: 414, y, width: 80, height: 34 },
      },
      {
        id: fieldId(3, rowIndex, "prior"),
        label: `Page 3 previous level ${rowIndex + 1}`,
        pageNumber: 3,
        initialValue: prior,
        align: "center",
        fontSize: 10.5,
        rect: { x: 506, y: y + 2, width: 88, height: 28 },
      },
      {
        id: fieldId(3, rowIndex, "current"),
        label: `Page 3 current level ${rowIndex + 1}`,
        pageNumber: 3,
        initialValue: current,
        align: "center",
        fontSize: 10.5,
        rect: { x: 611, y: y + 2, width: 88, height: 28 },
      },
    ];
  });
}

function makeTemperatureFields(pageNumber: number, rows: string[][]): EditablePdfField[] {
  return rows.flatMap(([area, reading], rowIndex) => {
    const y = rowTops[rowIndex];
    return [
      {
        id: fieldId(pageNumber, rowIndex, "area"),
        label: `Page ${pageNumber} area ${rowIndex + 1}`,
        pageNumber,
        initialValue: area,
        align: "left",
        multiline: area.includes("\n"),
        fontSize: 10.5,
        rect: { x: 451, y, width: 80, height: 34 },
      },
      {
        id: fieldId(pageNumber, rowIndex, "reading"),
        label: `Page ${pageNumber} reading ${rowIndex + 1}`,
        pageNumber,
        initialValue: reading,
        align: "center",
        fontSize: 10.5,
        rect: { x: 541, y: y + 2, width: 88, height: 28 },
      },
    ];
  });
}

export const editableImageDocuments: EditableImageDocument[] = [
  {
    slug: "waitrose-balham-ucb-daily-report-2026-08-26",
    title: "Waitrose Balham - UCB Daily Report - 26-08-2026",
    description: "Editable lux and temperature pages for the Waitrose Balham daily report.",
    sourceHref: "/api/admin/edit-images/waitrose-balham-ucb-daily-report-2026-08-26/source",
    downloadHref: "/api/admin/edit-images/waitrose-balham-ucb-daily-report-2026-08-26/download",
    editedFileName: "Waitrose Balham - UCB Daily Report - 26-08-2026 - edited.pdf",
    pages: [
      { pageNumber: 3, title: "Page 3 - Lux Levels", imageSrc: "/edit-images/waitrose-balham/page-03.png", width: pageWidth, height: pageHeight },
      { pageNumber: 4, title: "Page 4 - Back of House Temperature Readings", imageSrc: "/edit-images/waitrose-balham/page-04.png", width: pageWidth, height: pageHeight },
      { pageNumber: 5, title: "Page 5 - Sales Floor Temperature Readings", imageSrc: "/edit-images/waitrose-balham/page-05.png", width: pageWidth, height: pageHeight },
    ],
    fields: [...makeLuxFields(), ...makeTemperatureFields(4, backOfHouseRows), ...makeTemperatureFields(5, salesFloorRows)],
  },
];

export function findEditableImageDocument(slug: string) {
  return editableImageDocuments.find((document) => document.slug === slug) ?? null;
}
