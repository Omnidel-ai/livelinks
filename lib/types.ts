export type Organization = {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  position: number;
};

export type Category = {
  id: string;
  name: string;
  position: number;
  org_id: string | null;
};

export type LinkStatus = "live" | "archive";

export type LinkRow = {
  id: string;
  title: string;
  url: string;
  category_id: string | null;
  sub_type: string | null;
  note: string | null;
  description: string | null;
  source_date: string | null;
  status: LinkStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type LinkView = {
  id: string;
  title: string;
  url: string;
  category: string;
  orgSlug: string;
  orgColor: string;
  subType: string;
  note: string;
  description: string;
  sourceDate: string;
  status: LinkStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrgGroup = {
  org: Organization;
  categories: { name: string; count: number }[];
  totalLinks: number;
};

export type VercelDeployment = {
  id: string;
  project_name: string;
  project_url: string;
  branch: string | null;
  commit_message: string | null;
  created_at: string;
  status: string | null;
  org_slug: string | null;
  link_id: string | null;
};
