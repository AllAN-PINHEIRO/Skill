import mysql.connector
def conectar_bd():
    try:
        conexao = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="Skill"
        )

        if conexao.is_connected():
            print("Conexão bem-sucedida!")
        else:
            print("Não foi possível conectar.")

        conexao.close()

    except mysql.connector.Error as e:
        print(f"Erro ao conectar: {e}")
