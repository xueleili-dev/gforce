export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "employee" | "manager" | "dept_head" | "finance" | "admin";
  departmentId: string;
}

export interface ExpenseListItem {
  id: string;
  title: string;
  type: string;
  amount: string;
  status: string;
  applicantName: string;
  departmentName: string;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseDetail extends ExpenseListItem {
  description: string;
  currentApproverName?: string;
  approvalRecords: ApprovalRecordItem[];
  attachments: AttachmentItem[];
}

export interface ApprovalRecordItem {
  id: string;
  level: string;
  approverName: string;
  status: string;
  action?: string;
  comment?: string;
  actedAt?: string;
}

export interface AttachmentItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
