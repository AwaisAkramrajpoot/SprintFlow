import enum


class MemberRole(str, enum.Enum):
    OWNER = "Owner"
    ADMIN = "Admin"
    MANAGER = "Manager"
    MEMBER = "Member"


class TaskPriority(str, enum.Enum):
    URGENT = "Urgent"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class CompanyPlan(str, enum.Enum):
    FREE = "Free"
    PRO = "Pro"
    BUSINESS = "Business"
    ENTERPRISE = "Enterprise"


class KnowledgeDocStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
