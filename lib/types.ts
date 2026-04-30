export type Category = {
  id: string;
  name: string;
  position: number;
};

export type LinkStatus = "live" | "archive";

export type LinkRow = {
  id: string;
  title: string;
  url: string;
  category_id: string | null;
  sub_type: string | null;
  note: string | null;
  status: LinkStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

// Shape used by the UI: link row joined with its category name.
export type LinkView = {
  id: string;
  title: string;
  url: string;
  category: string;
  subType: string;
  note: string;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
};
