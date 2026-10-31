class NaoEncontradoError(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class ConflitoError(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class RegraNegocioError(Exception):
    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail
