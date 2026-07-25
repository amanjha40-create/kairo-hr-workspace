export type VerificationStatus =
  | "Pending"
  | "Under Review"
  | "Documents Requested"
  | "Verified"
  | "Rejected";

export type EmployeeStatus = "Active" | "Inactive" | "Invited";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  manager: string;
  employmentType: "Full-time" | "Contract" | "Intern";
  employmentStatus: EmployeeStatus;
  verificationStatus: VerificationStatus;
  trustScore: number;
  joinedAt: string;
  updatedAt: string;
  initials: string;
}

export interface VerificationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  requestedAt: string; // ISO
  requestedBy: string;
  assignedHr: string;
  status: VerificationStatus;
  notes?: string;
  documents: { name: string; kind: string; uploaded: boolean }[];
  timeline: { at: string; label: string; actor: string }[];
  employmentHistory: { company: string; role: string; from: string; to: string }[];
}

export interface ActivityItem {
  id: string;
  kind: "verified" | "invited" | "completed" | "rejected" | "documents" | "shared";
  actor: string;
  subject: string;
  at: string;
}

const DEPTS = [
  "Engineering",
  "Design",
  "Product",
  "Sales",
  "Operations",
  "Marketing",
  "Finance",
  "People",
];
const ROLES: Record<string, string[]> = {
  Engineering: [
    "Software Engineer",
    "Senior Engineer",
    "Staff Engineer",
    "Data Engineer",
    "Engineering Manager",
  ],
  Design: ["Product Designer", "Design Lead", "Brand Designer"],
  Product: ["Product Manager", "Senior PM", "Product Analyst"],
  Sales: ["Account Executive", "SDR", "Sales Manager"],
  Operations: ["Operations Analyst", "COO Chief of Staff", "Ops Lead"],
  Marketing: ["Marketing Lead", "Content Strategist", "Growth Manager"],
  Finance: ["Financial Analyst", "Controller", "Finance Manager"],
  People: ["HR Business Partner", "Talent Partner", "People Ops"],
};

const NAMES = [
  "Priya Raman",
  "Arjun Mehta",
  "Sara Khan",
  "Karthik Venugopal",
  "Neha Sharma",
  "Rohan Kapoor",
  "Ananya Iyer",
  "Vikram Singh",
  "Meera Patel",
  "Rahul Verma",
  "Divya Nair",
  "Aditya Rao",
  "Kavya Menon",
  "Siddharth Joshi",
  "Isha Bansal",
  "Manav Gupta",
  "Tara D'Souza",
  "Nikhil Reddy",
  "Zoya Ahmed",
  "Yash Malhotra",
  "Aarav Chatterjee",
  "Riya Bhatt",
  "Devansh Shah",
  "Simran Kaur",
];

function seededPick<T>(arr: T[], seed: number) {
  return arr[seed % arr.length];
}
function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const statusRoll: VerificationStatus[] = [
  "Verified",
  "Verified",
  "Verified",
  "Pending",
  "Under Review",
  "Documents Requested",
  "Rejected",
];
const empStatusRoll: EmployeeStatus[] = [
  "Active",
  "Active",
  "Active",
  "Active",
  "Invited",
  "Inactive",
];

export const seedEmployees: Employee[] = NAMES.map((name, i) => {
  const dept = seededPick(DEPTS, i);
  const role = seededPick(ROLES[dept], i * 3);
  const vStatus = statusRoll[i % statusRoll.length];
  const eStatus = empStatusRoll[i % empStatusRoll.length];
  const daysAgo = 3 + i * 5;
  const updDays = (i % 9) + 1;
  return {
    id: `EMP-${(1024 + i).toString()}`,
    name,
    email: `${name
      .toLowerCase()
      .replace(/[^a-z]/g, ".")
      .replace(/\.+/g, ".")}@acme.co`,
    phone: `+91 9${(800000000 + i * 12345).toString().slice(0, 9)}`,
    department: dept,
    role,
    manager: seededPick(NAMES, i + 7),
    employmentType: (["Full-time", "Full-time", "Full-time", "Contract", "Intern"] as const)[i % 5],
    employmentStatus: eStatus,
    verificationStatus: vStatus,
    trustScore:
      vStatus === "Verified"
        ? 88 + ((i * 7) % 12)
        : vStatus === "Rejected"
          ? 42 + ((i * 3) % 15)
          : 60 + ((i * 5) % 20),
    joinedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - updDays * 86400000).toISOString(),
    initials: initials(name),
  };
});

export const seedRequests: VerificationRequest[] = seedEmployees.slice(0, 15).map((e, i) => {
  const daysAgo = (i % 9) + 1;
  const status = statusRoll[i % statusRoll.length];
  return {
    id: `VR-${1040 + i}`,
    employeeId: e.id,
    employeeName: e.name,
    department: e.department,
    role: e.role,
    requestedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    requestedBy: seededPick(["Riya Kapoor", "Aman Joshi", "Neel Shah", "Isha Bansal"], i),
    assignedHr: seededPick(["Riya Kapoor", "Aman Joshi", "Neel Shah"], i + 2),
    status,
    documents: [
      { name: "Offer Letter.pdf", kind: "Offer letter", uploaded: true },
      {
        name: "Relieving Letter.pdf",
        kind: "Relieving letter",
        uploaded: status !== "Documents Requested",
      },
      { name: "Payslip Mar.pdf", kind: "Payslip", uploaded: status === "Verified" },
    ],
    timeline: [
      {
        at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        label: "Request created",
        actor: "HR",
      },
      {
        at: new Date(Date.now() - daysAgo * 86400000 + 3600000).toISOString(),
        label: "Employee notified",
        actor: "System",
      },
      ...(status !== "Pending"
        ? [
            {
              at: new Date(Date.now() - (daysAgo - 1) * 86400000).toISOString(),
              label: "Documents received",
              actor: "Employee",
            },
          ]
        : []),
      ...(status === "Verified"
        ? [
            {
              at: new Date(Date.now() - Math.max(1, daysAgo - 2) * 86400000).toISOString(),
              label: "Verification approved",
              actor: "Kairo AI",
            },
          ]
        : []),
      ...(status === "Rejected"
        ? [
            {
              at: new Date(Date.now() - Math.max(1, daysAgo - 2) * 86400000).toISOString(),
              label: "Rejected — tenure mismatch",
              actor: "Reviewer",
            },
          ]
        : []),
    ],
    employmentHistory: [
      { company: "Acme", role: e.role, from: e.joinedAt.slice(0, 7), to: "Present" },
      { company: "Northwind Labs", role: "Associate " + e.role, from: "2021-04", to: "2023-08" },
    ],
  };
});

export const seedActivity: ActivityItem[] = [
  { id: "a1", kind: "verified", actor: "Kairo AI", subject: "Priya Raman", at: "2m ago" },
  { id: "a2", kind: "invited", actor: "Riya Kapoor", subject: "3 employees", at: "14m ago" },
  {
    id: "a3",
    kind: "completed",
    actor: "System",
    subject: "Arjun Mehta — Employment",
    at: "1h ago",
  },
  {
    id: "a4",
    kind: "documents",
    actor: "Aman Joshi",
    subject: "requested payslip from Sara Khan",
    at: "3h ago",
  },
  {
    id: "a5",
    kind: "shared",
    actor: "Neel Shah",
    subject: "verification report with Northwind",
    at: "Yesterday",
  },
  {
    id: "a6",
    kind: "rejected",
    actor: "Reviewer",
    subject: "Karthik V. — tenure mismatch",
    at: "Yesterday",
  },
];

// Reports data
export const monthlyStats = [
  { m: "Jan", verified: 42, rejected: 3, pending: 8 },
  { m: "Feb", verified: 58, rejected: 4, pending: 11 },
  { m: "Mar", verified: 74, rejected: 5, pending: 9 },
  { m: "Apr", verified: 81, rejected: 2, pending: 12 },
  { m: "May", verified: 96, rejected: 6, pending: 14 },
  { m: "Jun", verified: 112, rejected: 4, pending: 10 },
  { m: "Jul", verified: 128, rejected: 5, pending: 13 },
  { m: "Aug", verified: 142, rejected: 3, pending: 11 },
];

export const deptStats = DEPTS.slice(0, 6).map((d, i) => ({
  name: d,
  value: 24 + i * 9 + (i % 3) * 4,
}));

export const heatmap: number[][] = Array.from({ length: 5 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) =>
    Math.max(0, Math.round(Math.sin(w * 0.9 + d * 0.6) * 5 + 6 + (d === 5 || d === 6 ? -3 : 0))),
  ),
);

export const savedFilters = [
  { id: "sf1", name: "Pending > 7 days" },
  { id: "sf2", name: "Rejected" },
  { id: "sf3", name: "Engineering department" },
  { id: "sf4", name: "Awaiting documents" },
];
