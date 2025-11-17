def is_institutional_email(email):
    """
    Este é o "Ponto Único de Verdade" para validar e-mails.
    Ele checa se o e-mail termina com os domínios institucionais permitidos.
    """
    if not email:
        return False
        
    email_lower = email.lower()
    
    dominiosPermitidos = (
        '@ifba.edu.br',
        '@gmail.com'
    )

    return email_lower.endswith(dominiosPermitidos)