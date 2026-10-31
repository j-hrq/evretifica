from pydantic import BaseModel


class PaginacaoOutput[T](BaseModel):
    items: list[T]
    total: int
    page: int
    per_page: int
    total_pages: int
