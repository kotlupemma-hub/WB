$body = @{
    recipient = "918374782253"
    messageType = "template"
    templateName = "sai_camp"
    languageCode = "te"
    headerImageUrl = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"
    templateParams = @(
        @{
            name = "name"
            value = "Sai Teja"
        }
    )
} | ConvertTo-Json -Depth 5

$res = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/messages/send' -Method Post -ContentType 'application/json' -Body $body
$res | ConvertTo-Json -Depth 5
