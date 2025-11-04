async function logar() {
    var username = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    try {
        const resposta = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, password: password })
        });

        const data = await resposta.json();
        document.getElementById("mensagem").textContent = data.message;

        if (resposta.status === 200) {
            document.getElementById("mensagem").style.color = "green";

            window.location.href = "../index.html";
        } else {
            document.getElementById("mensagem").style.color = "red";
        }

    } catch (erro) {
        document.getElementById("mensagem").textContent = "Erro na requisição: " + erro;
        document.getElementById("mensagem").style.color = "red";
    }
}
