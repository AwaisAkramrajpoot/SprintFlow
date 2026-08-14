from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


def not_found(resource: str = "Resource") -> AppException:
    return AppException(status.HTTP_404_NOT_FOUND, f"{resource} not found")


def forbidden(detail: str = "Forbidden") -> AppException:
    return AppException(status.HTTP_403_FORBIDDEN, detail)


def unauthorized(detail: str = "Not authenticated") -> AppException:
    return AppException(status.HTTP_401_UNAUTHORIZED, detail)


def bad_request(detail: str) -> AppException:
    return AppException(status.HTTP_400_BAD_REQUEST, detail)


def service_unavailable(detail: str = "Service unavailable") -> AppException:
    return AppException(status.HTTP_503_SERVICE_UNAVAILABLE, detail)
