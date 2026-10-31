import pytest

from app.schemas.pessoa import validar_cnpj, validar_cpf


class TestValidarCpf:
    @pytest.mark.parametrize(
        "cpf_valido",
        [
            "52998224725",
            "11144477735",
            "12345678909",
        ],
    )
    def test_cpf_valido_so_digitos(self, cpf_valido: str) -> None:
        assert validar_cpf(cpf_valido) == cpf_valido

    def test_cpf_valido_com_mascara(self) -> None:
        assert validar_cpf("529.982.247-25") == "52998224725"
        assert validar_cpf(" 111.444.777-35 ") == "11144477735"

    @pytest.mark.parametrize(
        "cpf_repetido",
        [
            "000.000.000-00",
            "00000000000",
            "111.111.111-11",
            "22222222222",
            "999.999.999-99",
        ],
    )
    def test_cpf_sequencia_repetida_rejeitado(self, cpf_repetido: str) -> None:
        with pytest.raises(ValueError):
            validar_cpf(cpf_repetido)

    @pytest.mark.parametrize(
        "cpf_invalido",
        [
            "52998224720",
            "52998224705",
            "529.982.247-99",
            "12345678900",
            "123",
            "123456789012",
            "5299822472a",
            "abc.def.ghi-jk",
            "",
        ],
    )
    def test_cpf_invalido_rejeitado(self, cpf_invalido: str) -> None:
        with pytest.raises(ValueError):
            validar_cpf(cpf_invalido)


class TestValidarCnpj:
    @pytest.mark.parametrize(
        "cnpj_valido",
        [
            "11222333000181",
            "11444777000161",
        ],
    )
    def test_cnpj_valido_so_digitos(self, cnpj_valido: str) -> None:
        assert validar_cnpj(cnpj_valido) == cnpj_valido

    def test_cnpj_valido_com_mascara(self) -> None:
        assert validar_cnpj("11.222.333/0001-81") == "11222333000181"
        assert validar_cnpj(" 11.444.777/0001-61 ") == "11444777000161"

    @pytest.mark.parametrize(
        "cnpj_repetido",
        [
            "00.000.000/0000-00",
            "00000000000000",
            "11.111.111/1111-11",
            "99.999.999/9999-99",
        ],
    )
    def test_cnpj_sequencia_repetida_rejeitado(self, cnpj_repetido: str) -> None:
        with pytest.raises(ValueError):
            validar_cnpj(cnpj_repetido)

    @pytest.mark.parametrize(
        "cnpj_invalido",
        [
            "11222333000180",
            "11222333000101",
            "11.222.333/0001-99",
            "12345678000100",
            "12345",
            "112223330001819",
            "1122233300018a",
            "",
        ],
    )
    def test_cnpj_invalido_rejeitado(self, cnpj_invalido: str) -> None:
        with pytest.raises(ValueError):
            validar_cnpj(cnpj_invalido)
