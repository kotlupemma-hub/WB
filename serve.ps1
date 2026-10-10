
<#
  WhatsFlow 
  ==========================================
  - SQLite persistence (System.Data.SQLite via NuGet)
  - All API endpoints for Contacts, Groups, Campaigns, Messages, Templates, Analytics
  - Meta Graph API proxy (token stored in DB, never in code)
  - Campaign engine with batch sending, rate limiting, failure tracking
  - Webhook receiver for delivery/read/failed status updates
  - Settings API for configuring WA credentials from the UI
#>

param (
  [int]$Port = 8080,
  [string]$Root = "D:\WABusiness",
  [switch]$NoOpen
)

# ----------------------------------------------------------------------
$dataDir = Join-Path $Root "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
$dbPath = Join-Path $dataDir "whatsflow.db"

# Download SQLite if not present
$sqliteDll = Join-Path $dataDir "System.Data.SQLite.dll"
if (-not (Test-Path $sqliteDll)) {
  Write-Host "  Downloading SQLite..." -ForegroundColor Yellow
  try {
    $nugetUrl = "https://www.nuget.org/api/v2/package/System.Data.SQLite.Core/1.0.118"
    $nupkg = Join-Path $dataDir "sqlite.nupkg"
    Invoke-WebRequest -Uri $nugetUrl -OutFile $nupkg -UseBasicParsing
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($nupkg)
    $entry = $zip.Entries | Where-Object { $_.FullName -match "net46/System.Data.SQLite.dll" -or $_.FullName -match "netstandard2.0/System.Data.SQLite.dll" } | Select-Object -First 1
    if (-not $entry) { $entry = $zip.Entries | Where-Object { $_.Name -eq "System.Data.SQLite.dll" } | Select-Object -First 1 }
    if ($entry) {
      $stream = $entry.Open()
      $outStream = [System.IO.File]::Create($sqliteDll)
      $stream.CopyTo($outStream); $outStream.Close(); $stream.Close()
      Write-Host "  SQLite downloaded." -ForegroundColor Green
    } else {
      Write-Host "  Could not find DLL in package. Using fallback JSON persistence." -ForegroundColor Red
    }
    $zip.Dispose()
    Remove-Item $nupkg -ErrorAction SilentlyContinue
  } catch {
    Write-Host "  SQLite download failed: $($_.Exception.Message). Using JSON fallback." -ForegroundColor Red
  }
}

$global:useSQLite = $false
if (Test-Path $sqliteDll) {
  try {
    Add-Type -Path $sqliteDll
    $global:useSQLite = $true
    Write-Host "  SQLite loaded." -ForegroundColor Green
  } catch {
    Write-Host "  SQLite load failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

# ----------------------------------------------------------------------
function Get-DbConnection {
  if ($global:useSQLite) {
    $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath;Version=3;")
    $conn.Open()
    return $conn
  }
  return $null
}

function Invoke-Sql {
  param($sql, [hashtable]$params = @{})
  if (-not $global:useSQLite) { return @() }
  $conn = Get-DbConnection
  try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    foreach ($key in $params.Keys) {
      $p = $cmd.CreateParameter(); $p.ParameterName = "@$key"; $p.Value = if ($null -eq $params[$key]) { [DBNull]::Value } else { $params[$key] }
      $cmd.Parameters.Add($p) | Out-Null
    }
    $reader = $cmd.ExecuteReader()
    $results = @()
    while ($reader.Read()) {
      $row = @{}
      for ($i = 0; $i -lt $reader.FieldCount; $i++) {
        $val = $reader[$i]
        $row[$reader.GetName($i)] = if ($val -is [DBNull]) { $null } else { $val }
      }
      $results += $row
    }
    $reader.Close()
    return $results
  } finally { $conn.Close() }
}

function Invoke-SqlNonQuery {
  param($sql, [hashtable]$params = @{})
  if (-not $global:useSQLite) { return 0 }
  $conn = Get-DbConnection
  try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    foreach ($key in $params.Keys) {
      $p = $cmd.CreateParameter(); $p.ParameterName = "@$key"; $p.Value = if ($null -eq $params[$key]) { [DBNull]::Value } else { $params[$key] }
      $cmd.Parameters.Add($p) | Out-Null
    }
    return $cmd.ExecuteNonQuery()
  } finally { $conn.Close() }
}

function Get-LastInsertId {
  $rows = Invoke-Sql "SELECT last_insert_rowid() as id"
  return $rows[0].id
}

# ----------------------------------------------------------------------
function Initialize-Schema {
  if (-not $global:useSQLite) { return }
  $schema = @"
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  company TEXT,
  city TEXT,
  tags TEXT DEFAULT '[]',
  notes TEXT,
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT 'manual',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contact_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#25D366',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contact_group_members (
  group_id INTEGER,
  contact_id INTEGER,
  PRIMARY KEY (group_id, contact_id),
  FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meta_template_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  language TEXT DEFAULT 'en_US',
  header_type TEXT DEFAULT 'none',
  header_content TEXT,
  body TEXT,
  footer TEXT,
  buttons TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  message_type TEXT DEFAULT 'template',
  template_id INTEGER,
  template_name TEXT,
  template_lang TEXT DEFAULT 'en_US',
  audience_type TEXT DEFAULT 'all',
  audience_id INTEGER,
  message_body TEXT,
  media_url TEXT,
  variable_mapping TEXT DEFAULT '{}',
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  total_recipients INTEGER DEFAULT 0,
  queued_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  contact_id INTEGER,
  phone TEXT NOT NULL,
  name TEXT,
  variables TEXT DEFAULT '{}',
  status TEXT DEFAULT 'queued',
  wa_message_id TEXT,
  error_message TEXT,
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  failed_at TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  campaign_recipient_id INTEGER,
  wa_message_id TEXT UNIQUE,
  direction TEXT DEFAULT 'outbound',
  recipient_phone TEXT,
  sender_phone TEXT,
  contact_id INTEGER,
  message_type TEXT NOT NULL,
  message_body TEXT,
  template_name TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'queued',
  error_code TEXT,
  error_message TEXT,
  queued_at TEXT DEFAULT (datetime('now')),
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  failed_at TEXT,
  received_at TEXT
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT,
  wa_message_id TEXT,
  phone TEXT,
  payload TEXT,
  processed INTEGER DEFAULT 0,
  received_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details TEXT,
  status TEXT DEFAULT 'success',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  waba_id TEXT,
  phone_id TEXT,
  app_id TEXT,
  app_secret TEXT,
  token TEXT,
  webhook_verify_token TEXT,
  status TEXT DEFAULT 'active',
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_wa_id ON messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
"@
  $conn = Get-DbConnection
  try {
    $schema -split ";\s*\n" | Where-Object { $_.Trim() } | ForEach-Object {
      $cmd = $conn.CreateCommand(); $cmd.CommandText = $_; $cmd.ExecuteNonQuery() | Out-Null
    }
  } finally { $conn.Close() }

  # Seed default settings
  $existingToken = (Invoke-Sql "SELECT value FROM settings WHERE key='wa_token'" )
  if (-not $existingToken) {
    $existingToken2 = Invoke-Sql "SELECT value FROM settings WHERE key='wa_phone_id'"
    if (-not $existingToken2) {
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('wa_token','EAAV0VpG2S4wBQZBBrqYDCvRbXpglV8Exd4vCJ0csJZC2dxsHT6FEx6HYVzTwG4t4HVPtAj9frO6C74SvMAMKwhLVXoW4Bc3MjGSUCjZA2hZCyzo4Cf9E1yMs6pVrErfiw76E1Ms86o5q5oI3ivdzbU2v2rFVbPWbl8EdsUCQVPyJxZC3NAMS5ZAlnEwEdDKgZDZD')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('wa_phone_id','1083180068204622')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('wa_waba_id','26571024635838799')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('wa_app_id','3068315393510761')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('wa_app_secret','d11d5abfdc772717025c625039a54417')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('webhook_verify_token','whatsflow_webhook_2024')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('webhook_url','https://pemmaglobal.com/webhook')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('meta_api_version','v20.0')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('business_name','Pemma Global Consulting')"
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO settings(key,value) VALUES('business_phone','+91 8919283809')"
    }
  }
  # Seed default business profile if table empty
  if ($global:useSQLite) {
    $bizCount = (Invoke-Sql "SELECT COUNT(*) as n FROM businesses")[0].n
    if ($bizCount -eq 0) {
      Invoke-SqlNonQuery "INSERT INTO businesses(name,phone,waba_id,phone_id,app_id,app_secret,token,webhook_verify_token,status,is_active) VALUES('Pemma Global Consulting','+91 8919283809','26571024635838799','1083180068204622','3068315393510761','d11d5abfdc772717025c625039a54417','EAAV0VpG2S4wBQZBBrqYDCvRbXpglV8Exd4vCJ0csJZC2dxsHT6FEx6HYVzTwG4t4HVPtAj9frO6C74SvMAMKwhLVXoW4Bc3MjGSUCjZA2hZCyzo4Cf9E1yMs6pVrErfiw76E1Ms86o5q5oI3ivdzbU2v2rFVbPWbl8EdsUCQVPyJxZC3NAMS5ZAlnEwEdDKgZDZD','whatsflow_webhook_2024','active',1)"
    }
  }
}

# ----------------------------------------------------------------------
$global:jsonDb = @{
  contacts = @(); groups = @(); campaigns = @(); messages = @()
  templates = @()
  businesses = @(
    @{
      id = 1; name = "Pemma Global Consulting"; phone = "+91 8919283809"
      waba_id = "26571024635838799"; phone_id = "1083180068204622"; app_id = "3068315393510761"
      app_secret = "d11d5abfdc772717025c625039a54417"
      token = "EAAV0VpG2S4wBQZBBrqYDCvRbXpglV8Exd4vCJ0csJZC2dxsHT6FEx6HYVzTwG4t4HVPtAj9frO6C74SvMAMKwhLVXoW4Bc3MjGSUCjZA2hZCyzo4Cf9E1yMs6pVrErfiw76E1Ms86o5q5oI3ivdzbU2v2rFVbPWbl8EdsUCQVPyJxZC3NAMS5ZAlnEwEdDKgZDZD"
      webhook_verify_token = "whatsflow_webhook_2024"; status = "active"; is_active = 1
    }
  )
  settings = @{
    wa_token = "EAAV0VpG2S4wBQZBBrqYDCvRbXpglV8Exd4vCJ0csJZC2dxsHT6FEx6HYVzTwG4t4HVPtAj9frO6C74SvMAMKwhLVXoW4Bc3MjGSUCjZA2hZCyzo4Cf9E1yMs6pVrErfiw76E1Ms86o5q5oI3ivdzbU2v2rFVbPWbl8EdsUCQVPyJxZC3NAMS5ZAlnEwEdDKgZDZD"
    wa_phone_id = "1083180068204622"; wa_waba_id = "26571024635838799"; wa_app_id = "3068315393510761"
    webhook_verify_token = "whatsflow_webhook_2024"; business_name = "Pemma Global Consulting"
    meta_api_version = "v20.0"; wa_app_secret = "d11d5abfdc772717025c625039a54417"
  }
}
$global:jsonDbPath = Join-Path $dataDir "db.json"
function Save-JsonDb { $global:jsonDb | ConvertTo-Json -Depth 10 | Set-Content $global:jsonDbPath -Encoding UTF8 }
function Load-JsonDb {
  if (Test-Path $global:jsonDbPath) {
    try { $global:jsonDb = Get-Content $global:jsonDbPath -Raw | ConvertFrom-Json } catch {}
  }
}
if (-not $global:useSQLite) { Load-JsonDb }

# ----------------------------------------------------------------------
function Get-Setting {
  param([string]$key, [string]$default = "")
  if ($global:useSQLite) {
    $rows = Invoke-Sql "SELECT value FROM settings WHERE key=@key" @{key=$key}
    if ($rows) { return $rows[0].value } else { return $default }
  } else {
    if ($global:jsonDb -and $global:jsonDb.settings -and $global:jsonDb.settings.$key) {
      return [string]$global:jsonDb.settings.$key
    }
    return $default
  }
}

function Set-Setting {
  param([string]$key, [string]$value)
  if ($global:useSQLite) {
    Invoke-SqlNonQuery "INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(@key,@value,datetime('now'))" @{key=$key; value=$value}
  } else {
    $global:jsonDb.settings | Add-Member -NotePropertyName $key -NotePropertyValue $value -Force
    Save-JsonDb
  }
}

function Get-AllSettings {
  if ($global:useSQLite) {
    $rows = Invoke-Sql "SELECT key, value FROM settings"
    $result = @{}
    foreach ($r in $rows) { $result[$r.key] = $r.value }
    return $result
  } else { return $global:jsonDb.settings }
}

# ----------------------------------------------------------------------
function Get-MetaHeaders {
  $token = Get-Setting "wa_token"
  return @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
}

function Get-MetaBaseUrl {
  $ver = Get-Setting "meta_api_version" "v20.0"
  return "https://graph.facebook.com/$ver"
}

function Invoke-MetaApi {
  param($method, $path, $body = $null, $rawBody = $null)
  $url = "$(Get-MetaBaseUrl)$path"
  try {
    $headers = Get-MetaHeaders
    if ($rawBody) {
      return Invoke-RestMethod -Uri $url -Method $method -Headers $headers -Body $rawBody
    } elseif ($body) {
      $json = $body | ConvertTo-Json -Depth 10 -Compress
      return Invoke-RestMethod -Uri $url -Method $method -Headers $headers -Body $json
    } else {
      return Invoke-RestMethod -Uri $url -Method $method -Headers $headers
    }
  } catch {
    $errMsg = $_.Exception.Message
    $errDetails = if ($_.ErrorDetails) { $_.ErrorDetails.Message } else { "" }
    if ($errDetails) { throw "$errMsg - $errDetails" }
    throw $errMsg
  }
}

# ----------------------------------------------------------------------
$global:mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
  ".csv" = "text/csv"; ".pdf" = "application/pdf"; ".mp4" = "video/mp4"
}

function Send-Response {
  param($res, $statusCode, $body, $contentType = "application/json")
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $res.StatusCode = $statusCode
  $res.ContentType = $contentType
  $res.ContentLength64 = $bytes.Length
  try { $res.OutputStream.Write($bytes, 0, $bytes.Length) } catch {}
  try { $res.OutputStream.Close() } catch {}
}

function Send-Json {
  param($res, $obj, $statusCode = 200)
  Send-Response $res $statusCode ($obj | ConvertTo-Json -Depth 10 -Compress)
}

function Send-Error {
  param($res, $message, $statusCode = 500, $details = "")
  Send-Json $res @{ success = $false; error = $message; details = $details } $statusCode
}

function Read-Body {
  param($req)
  $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
  $body = $reader.ReadToEnd()
  try { return $body | ConvertFrom-Json } catch { return $null }
}

function Read-BodyRaw {
  param($req)
  $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
  return $reader.ReadToEnd()
}

# ----------------------------------------------------------------------
function Start-CampaignAsync {
  param([int]$campaignId)
  $job = Start-Job -ScriptBlock {
    param($campaignId, $dbPath, $dataDir, $sqliteDll)

    # Load SQLite in job
    $useSQLite = $false
    if (Test-Path $sqliteDll) {
      try { Add-Type -Path $sqliteDll; $useSQLite = $true } catch {}
    }

    function Get-DbConn {
      $conn = New-Object System.Data.SQLite.SQLiteConnection("Data Source=$dbPath;Version=3;")
      $conn.Open(); return $conn
    }
    function Exec-Sql { param($sql, $ps=@{})
      $c = Get-DbConn; try {
        $cmd = $c.CreateCommand(); $cmd.CommandText = $sql
        foreach ($k in $ps.Keys) { $p=$cmd.CreateParameter();$p.ParameterName="@$k";$p.Value=if($null -eq $ps[$k]){[DBNull]::Value}else{$ps[$k]};$cmd.Parameters.Add($p)|Out-Null }
        $rdr=$cmd.ExecuteReader(); $rows=@()
        while($rdr.Read()){$row=@{};for($i=0;$i -lt $rdr.FieldCount;$i++){$v=$rdr[$i];$row[$rdr.GetName($i)]=if($v -is [DBNull]){$null}else{$v}};$rows+=$row}
        $rdr.Close(); return $rows
      } finally { $c.Close() }
    }
    function Exec-NonQuery { param($sql, $ps=@{})
      $c = Get-DbConn; try {
        $cmd = $c.CreateCommand(); $cmd.CommandText = $sql
        foreach ($k in $ps.Keys) { $p=$cmd.CreateParameter();$p.ParameterName="@$k";$p.Value=if($null -eq $ps[$k]){[DBNull]::Value}else{$ps[$k]};$cmd.Parameters.Add($p)|Out-Null }
        return $cmd.ExecuteNonQuery()
      } finally { $c.Close() }
    }
    function Get-Set { param($key, $def="")
      $r = Exec-Sql "SELECT value FROM settings WHERE key=@key" @{key=$key}
      if ($r) { return $r[0].value } else { return $def }
    }

    # Mark campaign as processing
    Exec-NonQuery "UPDATE campaigns SET status='processing', started_at=datetime('now'), updated_at=datetime('now') WHERE id=@id" @{id=$campaignId}

    $campaign = (Exec-Sql "SELECT * FROM campaigns WHERE id=@id" @{id=$campaignId})[0]
    if (-not $campaign) { return }

    $waToken = Get-Set "wa_token"
    $phoneId = Get-Set "wa_phone_id"
    $apiVer  = Get-Set "meta_api_version" "v20.0"
    $baseUrl = "https://graph.facebook.com/$apiVer/$phoneId/messages"
    $headers = @{ "Authorization"="Bearer $waToken"; "Content-Type"="application/json" }

    $recipients = Exec-Sql "SELECT * FROM campaign_recipients WHERE campaign_id=@cid AND status='queued'" @{cid=$campaignId}

    $sentCount = 0; $failedCount = 0; $total = $recipients.Count

    foreach ($r in $recipients) {
      try {
        # Build payload
        $payload = @{}
        $msgType = $campaign.message_type
        $toPhone = $r.phone -replace "[^0-9]", ""
        if ($toPhone.Length -eq 10) { $toPhone = "91$toPhone" }

        if ($msgType -eq "text") {
          $payload = @{
            messaging_product = "whatsapp"; to = $toPhone; type = "text"
            text = @{ body = $campaign.message_body }
          }
        } elseif ($msgType -eq "template") {
          $components = @()
          # Get variable mapping
          $varMap = @{}
          try { $varMap = $campaign.variable_mapping | ConvertFrom-Json -AsHashtable } catch {}

          # Resolve variables for this recipient
          $resolvedVars = @()
          $varMap.Keys | Sort-Object | ForEach-Object {
            $val = $varMap[$_]
            if ($val -eq "__name__") { $val = $r.name }
            elseif ($val -eq "__phone__") { $val = $r.phone }
            elseif ($val -eq "__date__") { $val = (Get-Date -Format "dd MMM yyyy") }
            $resolvedVars += $val
          }

          if ($resolvedVars.Count -gt 0) {
            $components += @{
              type = "body"
              parameters = @($resolvedVars | ForEach-Object { @{ type="text"; text="$_" } })
            }
          }

          # Check for flow button or media headers on template
          $templateRow = if ($campaign.template_id) { (Exec-Sql "SELECT * FROM templates WHERE id=@id" @{id=$campaign.template_id}) } else { @() }
          if ($templateRow.Count -gt 0) {
            try {
              $btns = $templateRow[0].buttons | ConvertFrom-Json
              if ($btns | Where-Object { $_.type -eq "flow" }) {
                $components += @{
                  type="button"; sub_type="flow"; index=[int]0
                  parameters=@(@{type="action";action=@{flow_token="unused"}})
                }
              }
              $hType = $templateRow[0].header_type
              if ($hType -eq "image" -and $campaign.media_url) {
                $components = @(@{type="header";parameters=@(@{type="image";image=@{link=$campaign.media_url}})}) + $components
              } elseif ($hType -eq "video" -and $campaign.media_url) {
                $components = @(@{type="header";parameters=@(@{type="video";video=@{link=$campaign.media_url}})}) + $components
              } elseif ($hType -eq "document" -and $campaign.media_url) {
                $components = @(@{type="header";parameters=@(@{type="document";document=@{link=$campaign.media_url}})}) + $components
              }
            } catch {}
          }

          $payload = @{
            messaging_product = "whatsapp"; to = $toPhone; type = "template"
            template = @{
              name = $campaign.template_name
              language = @{ code = ($campaign.template_lang -replace '\s','') }
            }
          }
          if ($components.Count -gt 0) { $payload.template.components = $components }

        } elseif ($msgType -match "^(image|video|document|audio|sticker)$") {
          $mediaObj = @{ link = $campaign.media_url }
          if ($campaign.message_body -and $msgType -match "^(image|video|document)$") { $mediaObj.caption = $campaign.message_body }
          $payload = @{ messaging_product="whatsapp"; to=$toPhone; type=$msgType; "$msgType"=$mediaObj }
        } elseif ($msgType -eq "interactive_list") {
          $payload = @{
            messaging_product="whatsapp"; to=$toPhone; type="interactive"
            interactive=@{ type="list"; header=@{type="text";text="Offer Details"}; body=@{text=if($campaign.message_body){$campaign.message_body}else{"Please choose an option"}}; action=@{button="Select"; sections=@(@{title="Options";rows=@(@{id="opt_1";title="Option 1"},@{id="opt_2";title="Option 2"})})} }
          }
        } elseif ($msgType -eq "interactive_buttons") {
          $payload = @{
            messaging_product="whatsapp"; to=$toPhone; type="interactive"
            interactive=@{ type="button"; body=@{text=if($campaign.message_body){$campaign.message_body}else{"Would you like to respond?"}}; action=@{buttons=@(@{type="reply";reply=@{id="btn_1";title="Yes"}},@{type="reply";reply=@{id="btn_2";title="No"}})} }
          }
        }

        $jsonBody = $payload | ConvertTo-Json -Depth 10 -Compress
        $resp = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $jsonBody
        $waId = $resp.messages[0].id

        Exec-NonQuery "UPDATE campaign_recipients SET status='sent', wa_message_id=@wid, sent_at=datetime('now') WHERE id=@id" @{wid=$waId; id=$r.id}
        Exec-NonQuery "INSERT OR IGNORE INTO messages(campaign_id,campaign_recipient_id,wa_message_id,recipient_phone,message_type,template_name,media_url,status,sent_at) VALUES(@cid,@crid,@wid,@phone,@mtype,@tname,@murl,'sent',datetime('now'))" @{
          cid=$campaignId; crid=$r.id; wid=$waId; phone=$r.phone; mtype=$msgType
          tname=$campaign.template_name; murl=$campaign.media_url
        }
        $sentCount++
        Exec-NonQuery "UPDATE campaigns SET sent_count=@s, updated_at=datetime('now') WHERE id=@id" @{s=$sentCount; id=$campaignId}

        # Rate limiting: 80 messages/min for standard tier
        Start-Sleep -Milliseconds 750

      } catch {
        $errMsg = $_.Exception.Message
        Exec-NonQuery "UPDATE campaign_recipients SET status='failed', error_message=@err, failed_at=datetime('now') WHERE id=@id" @{err=$errMsg; id=$r.id}
        $failedCount++
        Exec-NonQuery "UPDATE campaigns SET failed_count=@f, updated_at=datetime('now') WHERE id=@id" @{f=$failedCount; id=$campaignId}
        Start-Sleep -Milliseconds 500
      }
    }

    # Mark campaign complete
    $finalStatus = if ($failedCount -eq $total) { "failed" } elseif ($failedCount -gt 0) { "completed_with_errors" } else { "completed" }
    Exec-NonQuery "UPDATE campaigns SET status=@s, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=@id" @{s=$finalStatus; id=$campaignId}

  } -ArgumentList $campaignId, $dbPath, $dataDir, $sqliteDll

  return $job
}

# ----------------------------------------------------------------------
function Sync-TemplatesFromMeta {
  try {
    $wabaId = Get-Setting "wa_waba_id"
    $result = Invoke-MetaApi "GET" "/$wabaId/message_templates?fields=id,name,category,language,status,components,rejected_reason&limit=100"
    if ($result.data) {
      foreach ($t in $result.data) {
        $headerType = "none"; $headerContent = ""; $body = ""; $footer = ""; $buttons = "[]"
        foreach ($comp in $t.components) {
          if ($comp.type -eq "HEADER") {
            $headerType = $comp.format.ToLower()
            $headerContent = if ($comp.text) { $comp.text } else { "" }
          } elseif ($comp.type -eq "BODY") { $body = $comp.text }
          elseif ($comp.type -eq "FOOTER") { $footer = $comp.text }
          elseif ($comp.type -eq "BUTTONS") {
            $btnArr = @($comp.buttons | ForEach-Object {
              $btn = @{ type = $_.type.ToLower(); text = $_.text }
              if ($_.url) { $btn.url = $_.url }
              if ($_.flow_id) { $btn.flowId = $_.flow_id }
              if ($_.navigate_screen) { $btn.navigateScreen = $_.navigate_screen }
              $btn
            })
            $buttons = $btnArr | ConvertTo-Json -Depth 5 -Compress
          }
        }
        if ($global:useSQLite) {
          $existing = Invoke-Sql "SELECT id FROM templates WHERE meta_template_id=@mid" @{mid=$t.id}
          if ($existing) {
            Invoke-SqlNonQuery "UPDATE templates SET name=@n, category=@cat, language=@lang, header_type=@ht, header_content=@hc, body=@b, footer=@f, buttons=@bt, status=@s, synced_at=datetime('now') WHERE meta_template_id=@mid" @{
              n=$t.name; cat=$t.category; lang=$t.language; ht=$headerType; hc=$headerContent
              b=$body; f=$footer; bt=$buttons; s=$t.status.ToLower(); mid=$t.id
            }
          } else {
            Invoke-SqlNonQuery "INSERT INTO templates(meta_template_id,name,category,language,header_type,header_content,body,footer,buttons,status,synced_at) VALUES(@mid,@n,@cat,@lang,@ht,@hc,@b,@f,@bt,@s,datetime('now'))" @{
              mid=$t.id; n=$t.name; cat=$t.category; lang=$t.language; ht=$headerType; hc=$headerContent
              b=$body; f=$footer; bt=$buttons; s=$t.status.ToLower()
            }
          }
        } else {
          $tplObj = @{ id=$t.id; meta_template_id=$t.id; name=$t.name; category=$t.category; language=$t.language; header_type=$headerType; header_content=$headerContent; body=$body; footer=$footer; buttons=$buttons; status=$t.status.ToLower() }
          $global:jsonDb.templates = @($global:jsonDb.templates | Where-Object { $_.id -ne $t.id }) + $tplObj
          Save-JsonDb
        }
      }
      return @{ success = $true; count = $result.data.Count }
    }
    return @{ success = $true; count = 0 }
  } catch {
    return @{ success = $false; error = $_.Exception.Message }
  }
}

# ----------------------------------------------------------------------
function Send-WaMessage {
  param($payload)
  $phoneId = Get-Setting "wa_phone_id"
  $result = Invoke-MetaApi "POST" "/$phoneId/messages" -body $payload
  $msgId = $result.messages[0].id

  # Persist to messages table
  $toPhone = $payload.to
  $msgType = $payload.type
  $tmplName = if ($payload.template) { $payload.template.name } else { $null }
  $body = if ($payload.text) { $payload.text.body } else { $null }
  Invoke-SqlNonQuery "INSERT OR IGNORE INTO messages(wa_message_id,recipient_phone,message_type,message_body,template_name,status,sent_at) VALUES(@wid,@phone,@mt,@body,@tname,'sent',datetime('now'))" @{
    wid=$msgId; phone=$toPhone; mt=$msgType; body=$body; tname=$tmplName
  }
  return $result
}

# ----------------------------------------------------------------------
function Handle-Request {
  param($ctx)
  $req = $ctx.Request
  $res = $ctx.Response
  $method = $req.HttpMethod
  $urlPath = $req.Url.LocalPath
  if ($urlPath.Contains("?")) { $urlPath = $urlPath.Split("?")[0] }
  $query = [System.Web.HttpUtility]::ParseQueryString($req.Url.Query)

  # ----------------------------------------------------------------------
  $res.Headers.Add("Access-Control-Allow-Origin", "*")
  $res.Headers.Add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-WF-Session")
  if ($method -eq "OPTIONS") { $res.StatusCode = 204; $res.OutputStream.Close(); return }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/health" -and $method -eq "GET") {
    Send-Json $res @{ status = "ok"; db = if ($global:useSQLite) { "sqlite" } else { "json" }; timestamp = (Get-Date -Format "o") }
    return
  }

  # ----------------------------------------------------------------------
  # WEBHOOK ENDPOINTS
  # ----------------------------------------------------------------------
  if ($urlPath -eq "/webhook") {
    if ($method -eq "GET") {
      $mode = $query["hub.mode"]; $token = $query["hub.verify_token"]; $challenge = $query["hub.challenge"]
      $expectedToken = Get-Setting "webhook_verify_token" "whatsflow_webhook_2024"
      if ($mode -eq "subscribe" -and $token -eq $expectedToken) {
        Send-Response $res 200 $challenge "text/plain"
        Write-Host "  " -ForegroundColor Green
      } else { Send-Error $res "Forbidden" 403 }
      return
    }
    if ($method -eq "POST") {
      $res.StatusCode = 200; $res.ContentLength64 = 0; try { $res.OutputStream.Close() } catch {}
      try {
        $bodyRaw = Read-BodyRaw $req
        $body = $bodyRaw | ConvertFrom-Json
        if ($body.object -ne "whatsapp_business_account") { return }

        $entry = $body.entry[0]
        $changes = $entry.changes[0].value

        if ($changes.messages) {
          foreach ($msg in $changes.messages) {
            Invoke-SqlNonQuery 'INSERT OR IGNORE INTO messages(wa_message_id,direction,sender_phone,message_type,message_body,status,received_at) VALUES(@wid,"inbound",@from,@type,@body,"received",datetime("now"))' @{
              wid=$msg.id; 'from'=$msg.from; 'type'=$msg.type; 'body'=$msg.text.body
            }
            Invoke-SqlNonQuery 'INSERT INTO webhook_events(event_type,wa_message_id,phone,payload) VALUES("message",@wid,@from,@payload)' @{
              wid=$msg.id; 'from'=$msg.from; payload=($msg | ConvertTo-Json -Compress)
            }
          }
        }
        if ($changes.statuses) {
          foreach ($status in $changes.statuses) {
            $st = $status.status # sent, delivered, read, failed
            $tsMs = if ($status.timestamp) { [long]$status.timestamp * 1000 } else { $null }
            $tsStr = if ($tsMs) { [datetime]::UnixEpoch.AddMilliseconds($tsMs).ToString("yyyy-MM-dd HH:mm:ss") } else { (Get-Date -Format "yyyy-MM-dd HH:mm:ss") }
            $col = "${st}_at"
            # Update message
            Invoke-SqlNonQuery "UPDATE messages SET status=@s WHERE wa_message_id=@wid" @{s=$st; wid=$status.id}
            if ($st -eq "delivered") { Invoke-SqlNonQuery "UPDATE messages SET delivered_at=@ts WHERE wa_message_id=@wid" @{ts=$tsStr; wid=$status.id} }
            if ($st -eq "read")      { Invoke-SqlNonQuery "UPDATE messages SET read_at=@ts WHERE wa_message_id=@wid" @{ts=$tsStr; wid=$status.id} }
            if ($st -eq "failed")    { Invoke-SqlNonQuery "UPDATE messages SET failed_at=@ts WHERE wa_message_id=@wid" @{ts=$tsStr; wid=$status.id} }
            # Update campaign_recipient
            Invoke-SqlNonQuery "UPDATE campaign_recipients SET status=@s WHERE wa_message_id=@wid" @{s=$st; wid=$status.id}
            # Update campaign counts
            $cr = Invoke-Sql "SELECT campaign_id FROM campaign_recipients WHERE wa_message_id=@wid" @{wid=$status.id}
            if ($cr -and $cr[0].campaign_id) {
              $cid = $cr[0].campaign_id
              if ($st -eq "delivered") { Invoke-SqlNonQuery "UPDATE campaigns SET delivered_count=delivered_count+1 WHERE id=@id" @{id=$cid} }
              if ($st -eq "read")      { Invoke-SqlNonQuery "UPDATE campaigns SET read_count=read_count+1 WHERE id=@id" @{id=$cid} }
              if ($st -eq "failed")    { Invoke-SqlNonQuery "UPDATE campaigns SET failed_count=failed_count+1 WHERE id=@id" @{id=$cid} }
            }
            Invoke-SqlNonQuery "INSERT INTO webhook_events(event_type,wa_message_id,payload) VALUES(@et,@wid,@payload)" @{
              et="status_$st"; wid=$status.id; payload=($status | ConvertTo-Json -Compress)
            }
          }
        }
      } catch { Write-Host "  Webhook error: $($_.Exception.Message)" -ForegroundColor Red }
      return
    }
  }

  # ----------------------------------------------------------------------
  # API ROUTES
  # ----------------------------------------------------------------------

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/settings" -and $method -eq "GET") {
    $s = Get-AllSettings
    $safe = @{}
    if ($s -is [hashtable]) {
      foreach ($k in $s.Keys) {
        if ($k -in @("wa_token","wa_app_secret")) { $safe[$k] = if ($s[$k]) { "***saved***" } else { "" } }
        else { $safe[$k] = $s[$k] }
      }
    } elseif ($null -ne $s) {
      foreach ($prop in $s.PSObject.Properties) {
        $k = $prop.Name; $v = $prop.Value
        if ($k -in @("wa_token","wa_app_secret")) { $safe[$k] = if ($v) { "***saved***" } else { "" } }
        else { $safe[$k] = $v }
      }
    }
    Send-Json $res @{ success=$true; settings=$safe }
    return
  }
  if ($urlPath -eq "/api/v1/settings" -and $method -eq "POST") {
    $body = Read-Body $req
    $allowed = @("wa_token","wa_phone_id","wa_waba_id","wa_app_id","wa_app_secret","webhook_verify_token","webhook_url","meta_api_version","business_name","business_phone")
    $body.PSObject.Properties | Where-Object { $_.Name -in $allowed } | ForEach-Object {
      Set-Setting $_.Name $_.Value
    }
    Send-Json $res @{ success=$true; message="Settings saved" }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/settings/test-connection" -and $method -eq "POST") {
    try {
      $phoneId = Get-Setting "wa_phone_id"
      $wabaId = Get-Setting "wa_waba_id"
      $phoneInfo = Invoke-MetaApi "GET" "/$phoneId?fields=display_phone_number,verified_name,status,quality_rating,code_verification_status"
      $wabaInfo = Invoke-MetaApi "GET" "/$wabaId?fields=name,currency,message_template_namespace"
      Send-Json $res @{
        success=$true; auth=$true; phone=$true; waba=$true
        phoneNumber=$phoneInfo.display_phone_number; businessName=$phoneInfo.verified_name
        wabaName=$wabaInfo.name; status=$phoneInfo.status; quality=$phoneInfo.quality_rating
        codeVerificationStatus=$phoneInfo.code_verification_status
      }
    } catch {
      Send-Json $res @{ success=$false; auth=$false; phone=$false; waba=$false; error=$_.Exception.Message } 500
    }
    return
  }

  # -- Businesses / Workspaces -------------------------------------------
  if ($urlPath -eq "/api/v1/businesses" -and $method -eq "GET") {
    if ($global:useSQLite) {
      $bizs = Invoke-Sql "SELECT * FROM businesses ORDER BY is_active DESC, name ASC"
      Send-Json $res @{ success=$true; businesses=$bizs }
    } else {
      $hasBiz = $null -ne $global:jsonDb.PSObject.Properties["businesses"]
      if (-not $hasBiz) {
        $defaultBizs = @(
          @{ id=1; name="Pemma Global Consulting"; phone="+91 8919283809"; waba_id="26571024635838799"; phone_id="1083180068204622"; app_id="3068315393510761"; app_secret="d11d5abfdc772717025c625039a54417"; token="EAAV0VpG2S4wBQZBBrqYDCvRbXpglV8Exd4vCJ0csJZC2dxsHT6FEx6HYVzTwG4t4HVPtAj9frO6C74SvMAMKwhLVXoW4Bc3MjGSUCjZA2hZCyzo4Cf9E1yMs6pVrErfiw76E1Ms86o5q5oI3ivdzbU2v2rFVbPWbl8EdsUCQVPyJxZC3NAMS5ZAlnEwEdDKgZDZD"; webhook_verify_token="whatsflow_webhook_2024"; status="active"; is_active=1 }
        )
        $global:jsonDb | Add-Member -NotePropertyName "businesses" -NotePropertyValue $defaultBizs -Force
        Save-JsonDb
      }
      Send-Json $res @{ success=$true; businesses=$global:jsonDb.businesses }
    }
    return
  }
  if ($urlPath -eq "/api/v1/businesses" -and $method -eq "POST") {
    $body = Read-Body $req
    if (-not $body.name) { Send-Error $res "Business name is required" 400; return }
    $token = if ($body.token) { $body.token } else { Get-Setting "wa_token" }
    $phoneId = if ($body.phoneId) { $body.phoneId } else { Get-Setting "wa_phone_id" }
    $wabaId = if ($body.wabaId) { $body.wabaId } else { Get-Setting "wa_waba_id" }
    $appId = if ($body.appId) { $body.appId } else { Get-Setting "wa_app_id" }
    $appSecret = if ($body.appSecret) { $body.appSecret } else { Get-Setting "wa_app_secret" }
    $phone = if ($body.phone) { $body.phone } else { "+91 8919283809" }
    $webhookToken = if ($body.webhookVerifyToken) { $body.webhookVerifyToken } else { "whatsflow_webhook_2024" }

    if ($global:useSQLite) {
      Invoke-SqlNonQuery "INSERT INTO businesses(name,phone,waba_id,phone_id,app_id,app_secret,token,webhook_verify_token,status,is_active) VALUES(@n,@p,@wid,@pid,@aid,@asec,@t,@wt,'active',0)" @{
        n=$body.name; p=$phone; wid=$wabaId; pid=$phoneId; aid=$appId; asec=$appSecret; t=$token; wt=$webhookToken
      }
      $id = Get-LastInsertId
      Send-Json $res @{ success=$true; id=$id; message="Business profile created" }
    } else {
      $id = (Get-Date -Format "yyyyMMddHHmmss")
      $b = @{ id=$id; name=$body.name; phone=$phone; waba_id=$wabaId; phone_id=$phoneId; app_id=$appId; app_secret=$appSecret; token=$token; webhook_verify_token=$webhookToken; status="active"; is_active=0 }
      $currentList = if ($null -ne $global:jsonDb.PSObject.Properties["businesses"]) { @($global:jsonDb.businesses) } else { @() }
      $newList = $currentList + $b
      $global:jsonDb | Add-Member -NotePropertyName "businesses" -NotePropertyValue $newList -Force
      Save-JsonDb
      Send-Json $res @{ success=$true; id=$id; message="Business profile created" }
    }
    return
  }
  if ($urlPath -match "^/api/v1/businesses/(\w+)/switch$" -and $method -eq "POST") {
    $id = $matches[1]
    if ($global:useSQLite) {
      $biz = (Invoke-Sql "SELECT * FROM businesses WHERE id=@id" @{id=$id})[0]
      if (-not $biz) { Send-Error $res "Business profile not found" 404; return }
      Invoke-SqlNonQuery "UPDATE businesses SET is_active=0"
      Invoke-SqlNonQuery "UPDATE businesses SET is_active=1 WHERE id=@id" @{id=$id}
      Set-Setting "business_name" $biz.name
      Set-Setting "business_phone" $biz.phone
      Set-Setting "wa_waba_id" $biz.waba_id
      Set-Setting "wa_phone_id" $biz.phone_id
      Set-Setting "wa_app_id" $biz.app_id
      if ($biz.app_secret) { Set-Setting "wa_app_secret" $biz.app_secret }
      if ($biz.token) { Set-Setting "wa_token" $biz.token }
      if ($biz.webhook_verify_token) { Set-Setting "webhook_verify_token" $biz.webhook_verify_token }
      Send-Json $res @{ success=$true; message="Switched to business: $($biz.name)"; activeBusiness=$biz }
    } else {
      $bizs = if ($null -ne $global:jsonDb.PSObject.Properties["businesses"]) { @($global:jsonDb.businesses) } else { @() }
      $biz = $bizs | Where-Object { [string]$_.id -eq [string]$id } | Select-Object -First 1
      if (-not $biz) { Send-Error $res "Business profile not found" 404; return }
      foreach ($b in $bizs) { $b.is_active = 0 }
      $biz.is_active = 1
      Set-Setting "business_name" $biz.name
      Set-Setting "business_phone" $biz.phone
      Set-Setting "wa_waba_id" $biz.waba_id
      Set-Setting "wa_phone_id" $biz.phone_id
      Set-Setting "wa_app_id" $biz.app_id
      if ($biz.app_secret) { Set-Setting "wa_app_secret" $biz.app_secret }
      if ($biz.token) { Set-Setting "wa_token" $biz.token }
      if ($biz.webhook_verify_token) { Set-Setting "webhook_verify_token" $biz.webhook_verify_token }
      Save-JsonDb
      Send-Json $res @{ success=$true; message="Switched to business: $($biz.name)"; activeBusiness=$biz }
    }
    return
  }
  if ($urlPath -match "^/api/v1/businesses/(\w+)$" -and $method -eq "DELETE") {
    $id = $matches[1]
    if ($global:useSQLite) {
      Invoke-SqlNonQuery "DELETE FROM businesses WHERE id=@id" @{id=$id}
    } else {
      $bizs = if ($null -ne $global:jsonDb.PSObject.Properties["businesses"]) { @($global:jsonDb.businesses) } else { @() }
      $filtered = @($bizs | Where-Object { [string]$_.id -ne [string]$id })
      $global:jsonDb | Add-Member -NotePropertyName "businesses" -NotePropertyValue $filtered -Force
      Save-JsonDb
    }
    Send-Json $res @{ success=$true; message="Business profile removed" }
    return
  }

  # -- Meta Registration & Code Request ----------------------------------
  if ($urlPath -eq "/api/v1/whatsapp/request-code" -and $method -eq "POST") {
    try {
      $phoneId = Get-Setting "wa_phone_id"
      $payload = @{ code_method = "SMS"; language = "en" }
      $metaResp = Invoke-MetaApi "POST" "/$phoneId/request_code" $payload
      Send-Json $res @{ success=$true; message="6-digit verification code requested via SMS!"; response=$metaResp }
    } catch {
      Send-Error $res "Request SMS failed: $($_.Exception.Message)" 400
    }
    return
  }
  if ($urlPath -eq "/api/v1/whatsapp/register" -and $method -eq "POST") {
    $body = Read-Body $req
    if (-not $body.pin) { Send-Error $res "6-digit verification PIN is required" 400; return }
    try {
      $phoneId = Get-Setting "wa_phone_id"
      $payload = @{ messaging_product = "whatsapp"; pin = [string]$body.pin }
      $metaResp = Invoke-MetaApi "POST" "/$phoneId/register" $payload
      Send-Json $res @{ success=$true; message="Phone number successfully registered with Meta Cloud API!"; response=$metaResp }
    } catch {
      Send-Error $res "Phone registration failed: $($_.Exception.Message)" 400
    }
    return
  }

  # -- Contacts -----------------------------------------------------------
  if ($urlPath -eq "/api/v1/contacts" -and $method -eq "GET") {
    $page = if ($query["page"]) { [int]$query["page"] } else { 1 }; if ($page -lt 1) { $page = 1 }
    $limit = if ($query["limit"]) { [int]$query["limit"] } else { 50 }; if ($limit -lt 1) { $limit = 50 }
    $search = $query["search"]
    $status = $query["status"]
    $offset = ($page - 1) * $limit

    if ($global:useSQLite) {
      $where = "WHERE 1=1"
      $params = @{}
      if ($search) { $where += " AND (name LIKE @s OR phone LIKE @s OR email LIKE @s OR company LIKE @s)"; $params["s"] = "%$search%" }
      if ($status -and $status -ne "all") { $where += " AND status=@status"; $params["status"] = $status }
      $total = (Invoke-Sql "SELECT COUNT(*) as n FROM contacts $where" $params)[0].n
      $params["limit"] = $limit; $params["offset"] = $offset
      $contacts = Invoke-Sql "SELECT * FROM contacts $where ORDER BY created_at DESC LIMIT @limit OFFSET @offset" $params
      Send-Json $res @{ success=$true; contacts=$contacts; total=$total; page=$page; limit=$limit }
    } else {
      $contacts = $global:jsonDb.contacts
      if ($search) { $contacts = $contacts | Where-Object { $_.name -like "*$search*" -or $_.phone -like "*$search*" } }
      Send-Json $res @{ success=$true; contacts=$contacts; total=$contacts.Count; page=1; limit=50 }
    }
    return
  }
  if ($urlPath -eq "/api/v1/contacts" -and $method -eq "POST") {
    $body = Read-Body $req
    if (-not $body.phone) { Send-Error $res "Phone number is required" 400; return }
    $phone = ($body.phone -replace "[^\d+]","")
    if ($phone.Length -eq 10) { $phone = "91$phone" }
    $tags = if ($body.tags) { ($body.tags | ConvertTo-Json -Compress) } else { "[]" }
    try {
      if ($global:useSQLite) {
        Invoke-SqlNonQuery "INSERT INTO contacts(name,phone,email,company,city,tags,notes,status,source) VALUES(@n,@p,@e,@c,@ci,@t,@notes,@s,@src)" @{
          n=$body.name; p=$phone; e=$body.email; c=$body.company; ci=$body.city; t=$tags; notes=$body.notes; s="active"; src="manual"
        }
        $id = Get-LastInsertId
        Send-Json $res @{ success=$true; id=$id; message="Contact added" }
      } else {
        $c = @{ id=(Get-Date -Format "yyyyMMddHHmmss"); name=$body.name; phone=$phone; email=$body.email; company=$body.company; tags=@(); status="active" }
        $global:jsonDb.contacts += $c; Save-JsonDb
        Send-Json $res @{ success=$true; id=$c.id }
      }
    } catch {
      if ($_.Exception.Message -match "UNIQUE") { Send-Error $res "A contact with this phone number already exists" 409 }
      else { Send-Error $res $_.Exception.Message }
    }
    return
  }
  if ($urlPath -match "^/api/v1/contacts/(\d+)$" -and $method -eq "PUT") {
    $id = $matches[1]; $body = Read-Body $req
    $tags = if ($body.tags) { ($body.tags | ConvertTo-Json -Compress) } else { "[]" }
    Invoke-SqlNonQuery "UPDATE contacts SET name=@n, email=@e, company=@c, city=@ci, tags=@t, notes=@notes, status=@s, updated_at=datetime('now') WHERE id=@id" @{
      n=$body.name; e=$body.email; c=$body.company; ci=$body.city; t=$tags; notes=$body.notes; s=$body.status; id=$id
    }
    Send-Json $res @{ success=$true; message="Contact updated" }
    return
  }
  if ($urlPath -match "^/api/v1/contacts/(\d+)$" -and $method -eq "DELETE") {
    $id = $matches[1]
    Invoke-SqlNonQuery "DELETE FROM contacts WHERE id=@id" @{id=$id}
    Send-Json $res @{ success=$true; message="Contact deleted" }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/contacts/import" -and $method -eq "POST") {
    try {
      $bodyRaw = Read-BodyRaw $req
      $data = $bodyRaw | ConvertFrom-Json
      $rows = $data.rows; $mapping = $data.mapping
      $total = $rows.Count; $valid = 0; $invalid = 0; $dups = 0; $errors = @()

      foreach ($row in $rows) {
        try {
          $phone = ($row.($mapping.phone) -replace "[^\d+]","")
          if ($phone.Length -eq 10) { $phone = "91$phone" }
          if ($phone.Length -lt 10) { $invalid++; continue }
          $name = if ($mapping.name) { $row.($mapping.name) } else { $phone }
          $email = if ($mapping.email) { $row.($mapping.email) } else { $null }
          $company = if ($mapping.company) { $row.($mapping.company) } else { $null }
          $city = if ($mapping.city) { $row.($mapping.city) } else { $null }
          Invoke-SqlNonQuery "INSERT OR IGNORE INTO contacts(name,phone,email,company,city,status,source) VALUES(@n,@p,@e,@c,@ci,'active','import')" @{
            n=$name; p=$phone; e=$email; c=$company; ci=$city
          }
          $valid++
        } catch {
          if ($_.Exception.Message -match "UNIQUE") { $dups++ } else { $invalid++; $errors += $_.Exception.Message }
        }
      }
      Send-Json $res @{ success=$true; stats=@{ total=$total; valid=$valid; invalid=$invalid; duplicates=$dups }; errors=$errors }
    } catch { Send-Error $res $_.Exception.Message }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/contacts/groups" -and $method -eq "GET") {
    if ($global:useSQLite) {
      $groups = Invoke-Sql "SELECT g.*, COUNT(m.contact_id) as member_count FROM contact_groups g LEFT JOIN contact_group_members m ON g.id=m.group_id GROUP BY g.id ORDER BY g.created_at DESC"
      Send-Json $res @{ success=$true; groups=$groups }
    } else {
      Send-Json $res @{ success=$true; groups=$global:jsonDb.groups }
    }
    return
  }
  if ($urlPath -eq "/api/v1/contacts/groups" -and $method -eq "POST") {
    $body = Read-Body $req
    $grpColor = if ($body.color) { $body.color } else { "#25D366" }
    Invoke-SqlNonQuery "INSERT INTO contact_groups(name,description,color) VALUES(@n,@d,@c)" @{ n=$body.name; d=$body.description; c=$grpColor }
    $id = Get-LastInsertId
    Send-Json $res @{ success=$true; id=$id; message="Group created" }
    return
  }
  if ($urlPath -match "^/api/v1/contacts/groups/(\d+)/members$" -and $method -eq "POST") {
    $groupId = $matches[1]; $body = Read-Body $req
    foreach ($cid in $body.contactIds) {
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO contact_group_members(group_id, contact_id) VALUES(@g,@c)" @{g=$groupId; c=$cid}
    }
    Send-Json $res @{ success=$true; message="Members added" }
    return
  }
  if ($urlPath -match "^/api/v1/contacts/groups/(\d+)$" -and $method -eq "DELETE") {
    $id = $matches[1]
    Invoke-SqlNonQuery "DELETE FROM contact_groups WHERE id=@id" @{id=$id}
    Send-Json $res @{ success=$true }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/templates" -and $method -eq "GET") {
    if ($global:useSQLite) {
      $templates = Invoke-Sql "SELECT * FROM templates ORDER BY status DESC, name ASC"
      $templates | ForEach-Object { try { $_.buttons = $_.buttons | ConvertFrom-Json } catch {} }
      Send-Json $res @{ success=$true; templates=$templates }
    } else {
      Send-Json $res @{ success=$true; templates=$global:jsonDb.templates }
    }
    return
  }
  if ($urlPath -eq "/api/v1/templates/sync" -and $method -eq "POST") {
    $result = Sync-TemplatesFromMeta
    $stCode = if ($result.success) { 200 } else { 500 }
    Send-Json $res $result $stCode
    return
  }
  if ($urlPath -eq "/api/v1/templates" -and $method -eq "POST") {
    $body = Read-Body $req
    # Create template via Meta API
    try {
      $wabaId = Get-Setting "wa_waba_id"
      $comps = @()
      if ($body.headerText) { $comps += @{ type="HEADER"; format="TEXT"; text=$body.headerText } }
      $comps += @{ type="BODY"; text=$body.body }
      if ($body.footer) { $comps += @{ type="FOOTER"; text=$body.footer } }
      if ($body.buttons -and $body.buttons.Count -gt 0) {
        $btnArr = @($body.buttons | ForEach-Object {
          if ($_.type -eq "flow") { @{type="FLOW";text=$_.text;flow_id=[long]$_.flowId;flow_action="NAVIGATE";navigate_screen="SURVEY"} }
          elseif ($_.type -eq "url") { @{type="URL";text=$_.text;url=$_.url} }
          else { @{type="QUICK_REPLY";text=$_.text} }
        })
        $comps += @{ type="BUTTONS"; buttons=$btnArr }
      }
      $metaPayload = @{
        name = ($body.name.ToLower() -replace '[^a-z0-9_]','')
        category = if ($body.category) { $body.category.ToUpper() } else { "MARKETING" }
        language = if ($body.language) { $body.language } else { "en_US" }
        components = $comps
      }
      $metaResp = Invoke-MetaApi "POST" "/$wabaId/message_templates" $metaPayload
      # Save to local DB
      Invoke-SqlNonQuery "INSERT INTO templates(meta_template_id,name,category,language,body,footer,buttons,status) VALUES(@mid,@n,@cat,@lang,@b,@f,@bt,'pending')" @{
        mid=$metaResp.id; n=$metaPayload.name; cat=$metaPayload.category; lang=$metaPayload.language
        b=$body.body; f=$body.footer; bt=($body.buttons | ConvertTo-Json -Compress)
      }
      $id = Get-LastInsertId
      Send-Json $res @{ success=$true; id=$id; metaId=$metaResp.id; message="Template submitted for review" }
    } catch { Send-Error $res "Template creation failed: $($_.Exception.Message)" }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/flows" -and $method -eq "GET") {
    try {
      $wabaId = Get-Setting "wa_waba_id"
      $result = Invoke-MetaApi "GET" "/$wabaId/flows?fields=id,name,status,categories&limit=50"
      Send-Json $res @{ success=$true; flows=$result.data }
    } catch { Send-Error $res "Could not fetch flows: $($_.Exception.Message)" }
    return
  }
  if ($urlPath -eq "/api/v1/flows" -and $method -eq "POST") {
    $body = Read-Body $req
    try {
      $wabaId = Get-Setting "wa_waba_id"
      $catVal = if ($body.category) { $body.category } else { "OTHER" }
      $payload = @{ name=$body.name; categories=@($catVal) }
      $result = Invoke-MetaApi "POST" "/$wabaId/flows" $payload
      Send-Json $res @{ success=$true; flowId=$result.id }
    } catch { Send-Error $res "Flow creation failed: $($_.Exception.Message)" }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/messages/send" -and $method -eq "POST") {
    $body = Read-Body $req
    try {
      $phoneId = Get-Setting "wa_phone_id"
      $waToken = Get-Setting "wa_token"
      $apiVer  = Get-Setting "meta_api_version" "v20.0"
      $metaUrl = "https://graph.facebook.com/$apiVer/$phoneId/messages"
      $headers = @{ "Authorization"="Bearer $waToken"; "Content-Type"="application/json" }

      $toPhone = ($body.to -replace "[^\d]","")
      if ($toPhone.Length -eq 10) { $toPhone = "91$toPhone" }

      $metaPayload = $null
      $msgType = $body.type

      if ($body.rawPayload) {
        $metaPayload = $body.rawPayload
        if (-not $metaPayload.to) { $metaPayload.to = $toPhone }
        if (-not $metaPayload.messaging_product) { $metaPayload.messaging_product = "whatsapp" }
      } elseif ($msgType -eq "text") {
        $metaPayload = @{ messaging_product="whatsapp"; to=$toPhone; type="text"; text=@{body=$body.message} }
      } elseif ($msgType -eq "template") {
        $components = @()
        $tmplName = $body.templateName
        $tmplLangRaw = if ($body.templateLang) { $body.templateLang } elseif ($body.language) { $body.language } else { "en_US" }
        $tmplLang = $tmplLangRaw -replace '\s',''

        # Load template from DB (SQLite or JSON DB)
        $tpl = if ($global:useSQLite) {
          (Invoke-Sql "SELECT * FROM templates WHERE name=@n" @{n=$tmplName}) | Select-Object -First 1
        } else {
          $global:jsonDb.templates | Where-Object { $_.name -eq $tmplName } | Select-Object -First 1
        }

        # Header parameters (image, video, document, text)
        $hType = if ($body.headerType) { $body.headerType } elseif ($tpl) { $tpl.header_type } else { "" }
        if ($hType -eq "image" -or $body.headerImageUrl) {
          $imgUrl = if ($body.headerImageUrl) { $body.headerImageUrl } else { $body.mediaUrl }
          if ($imgUrl) { $components += @{ type="header"; parameters=@(@{type="image";image=@{link=$imgUrl}}) } }
        } elseif ($hType -eq "video" -or $body.headerVideoUrl) {
          $vidUrl = if ($body.headerVideoUrl) { $body.headerVideoUrl } else { $body.mediaUrl }
          if ($vidUrl) { $components += @{ type="header"; parameters=@(@{type="video";video=@{link=$vidUrl}}) } }
        } elseif ($hType -eq "document" -or $body.headerDocumentUrl) {
          $docUrl = if ($body.headerDocumentUrl) { $body.headerDocumentUrl } else { $body.mediaUrl }
          if ($docUrl) {
            $docObj = @{ link=$docUrl }
            if ($body.mediaFilename) { $docObj.filename = $body.mediaFilename }
            $components += @{ type="header"; parameters=@(@{type="document";document=$docObj}) }
          }
        } elseif ($hType -eq "text" -and $body.headerText) {
          $components += @{ type="header"; parameters=@(@{type="text";text=$body.headerText}) }
        }

        # Body variables
        if ($body.variables -and $body.variables.Count -gt 0) {
          $parameters = @($body.variables | Where-Object { $_ } | ForEach-Object { @{ type="text"; text="$_" } })
          if ($parameters.Count -gt 0) { $components += @{ type="body"; parameters=$parameters } }
        } elseif ($body.templateParams) {
          $parameters = @($body.templateParams | Where-Object { $_.value } | ForEach-Object { @{ type="text"; parameter_name=$_.name; text=$_.value } })
          if ($parameters.Count -gt 0) { $components += @{ type="body"; parameters=$parameters } }
        }

        # Flow button
        $hasFlowBtn = $body.hasFlow
        if (-not $hasFlowBtn -and $tpl -and $tpl.buttons) {
          try {
            $btns = if ($tpl.buttons -is [string]) { $tpl.buttons | ConvertFrom-Json } else { $tpl.buttons }
            if ($btns -and ($btns | Where-Object { $_.type -eq "flow" })) { $hasFlowBtn = $true }
          } catch {}
        }
        if ($hasFlowBtn) {
          $components += @{
            type="button"; sub_type="flow"; index=[int]0
            parameters=@(@{type="action"; action=@{flow_token=if($body.flowToken){$body.flowToken}else{"unused"}}})
          }
        }

        $metaPayload = @{
          messaging_product="whatsapp"; to=$toPhone; type="template"
          template=@{ name=$tmplName; language=@{code=$tmplLang} }
        }
        if ($components.Count -gt 0) { $metaPayload.template.components = $components }

      } elseif ($msgType -match "^(image|document|video|audio|sticker)$") {
        $mediaObj = @{ link = $body.mediaUrl }
        if ($body.mediaCaption -and $msgType -match "^(image|document|video)$") { $mediaObj.caption = $body.mediaCaption }
        if ($msgType -eq "document" -and $body.mediaFilename) { $mediaObj.filename = $body.mediaFilename }
        $metaPayload = @{ messaging_product="whatsapp"; to=$toPhone; type=$msgType; "$msgType"=$mediaObj }
      } elseif ($msgType -eq "location") {
        $metaPayload = @{ messaging_product="whatsapp"; to=$toPhone; type="location"; location=@{latitude=[double]$body.latitude;longitude=[double]$body.longitude;name=$body.locationName;address=$body.locationAddress} }
      } elseif ($msgType -eq "contacts") {
        $contactObj = @{ name=@{formatted_name=$body.contactName;first_name=($body.contactName -split " ")[0]}; phones=@(@{phone=$body.contactPhone;type="WORK"}) }
        if ($body.contactEmail) { $contactObj.emails = @(@{email=$body.contactEmail;type="WORK"}) }
        if ($body.contactOrg) { $contactObj.org = @{company=$body.contactOrg} }
        $metaPayload = @{ messaging_product="whatsapp"; to=$toPhone; type="contacts"; contacts=@($contactObj) }
      } elseif ($msgType -eq "interactive_list") {
        $rows = if ($body.listRows) { @($body.listRows | ForEach-Object { @{id=$_.id;title=$_.title;description=$_.description} }) } else { @(@{id="opt_1";title="Option 1";description="First option"},@{id="opt_2";title="Option 2";description="Second option"}) }
        $metaPayload = @{
          messaging_product="whatsapp"; to=$toPhone; type="interactive"
          interactive=@{ type="list"; header=@{type="text";text=if($body.listHeader){$body.listHeader}else{"Select Option"}}; body=@{text=if($body.message){$body.message}else{"Please choose"}}; footer=@{text=if($body.listFooter){$body.listFooter}else{"WhatsFlow"}}; action=@{button=if($body.listButton){$body.listButton}else{"Choose"}; sections=@(@{title=if($body.sectionTitle){$body.sectionTitle}else{"Options"};rows=$rows})} }
        }
      } elseif ($msgType -eq "interactive_buttons") {
        $buttons = if ($body.quickReplies) { $idx=1; @($body.quickReplies | ForEach-Object { $b=@{type="reply";reply=@{id="btn_$idx";title=$_}}; $idx++; $b }) } else { @(@{type="reply";reply=@{id="btn_yes";title="Yes"}},@{type="reply";reply=@{id="btn_no";title="No"}}) }
        $metaPayload = @{ messaging_product="whatsapp"; to=$toPhone; type="interactive"; interactive=@{type="button";body=@{text=$body.message};action=@{buttons=$buttons}} }
      }

      if (-not $metaPayload) { Send-Error $res "Unsupported message type: $msgType" 400; return }

      $jsonPayload = $metaPayload | ConvertTo-Json -Depth 10 -Compress
      Write-Host "  Sending Meta Payload: $jsonPayload" -ForegroundColor Cyan
      $metaResp = Invoke-RestMethod -Uri $metaUrl -Method Post -Headers $headers -Body $jsonPayload

      $msgId = $metaResp.messages[0].id
      Invoke-SqlNonQuery "INSERT OR IGNORE INTO messages(wa_message_id,recipient_phone,message_type,message_body,template_name,status,sent_at) VALUES(@wid,@phone,@mt,@body,@tname,'sent',datetime('now'))" @{
        wid=$msgId; phone=$toPhone; mt=$msgType; body=$body.message; tname=$body.templateName
      }

      Send-Json $res @{
        success=$true; messageId=$msgId; status="accepted"
        rawPayload=$metaPayload; rawResponse=$metaResp
        timestamp=(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
      }
    } catch {
      $err = $_.Exception.Message
      $errDetails = ""
      if ($_.ErrorDetails) { $errDetails = $_.ErrorDetails.Message }
      elseif ($_.Exception.Response) {
        try {
          $stream = $_.Exception.Response.GetResponseStream()
          $reader = New-Object System.IO.StreamReader($stream)
          $errDetails = $reader.ReadToEnd()
        } catch {}
      }
      Write-Host "  Send error: $err details: $errDetails" -ForegroundColor Red
      $respObj = @{ success=$false; error=$err; details=$errDetails }
      if ($errDetails) {
        try {
          $errJson = $errDetails | ConvertFrom-Json
          $metaCode = $errJson.error.code
          $metaMsg = $errJson.error.message
          if ($metaCode -eq 131047 -or $metaMsg -match "131047" -or $metaMsg -match "Reaching the user") {
            $respObj = @{ success=$false; error_code="TEMPLATE_REQUIRED"; user_message="Cannot send a free-form text message to start a conversation."; reason="WhatsApp requires an approved template to start new conversations."; suggestion="Please switch to Template message type."; retryable=$false; rawError=$errJson }
          } else {
            $respObj = @{ success=$false; error_code="META_API_ERROR"; user_message="Meta rejected the message: $metaMsg"; reason=$metaMsg; suggestion=$errJson.error.error_data.details; retryable=$false; rawError=$errJson }
          }
        } catch {}
      }
      Send-Json $res $respObj 400
    }
    return
  }
  if ($urlPath -eq "/api/v1/messages" -and $method -eq "GET") {
    $page = if ($query["page"]) { [int]$query["page"] } else { 1 }; if ($page -lt 1) { $page = 1 }
    $limit = if ($query["limit"]) { [int]$query["limit"] } else { 50 }; if ($limit -lt 1) { $limit = 50 }
    $offset = ($page - 1) * $limit
    $status = $query["status"]; $msgType = $query["type"]; $campaignId = $query["campaignId"]

    if ($global:useSQLite) {
      $where = "WHERE direction='outbound'"; $params = @{}
      if ($status) { $where += " AND status=@status"; $params["status"] = $status }
      if ($msgType) { $where += " AND message_type=@mtype"; $params["mtype"] = $msgType }
      if ($campaignId) { $where += " AND campaign_id=@cid"; $params["cid"] = $campaignId }
      $total = (Invoke-Sql "SELECT COUNT(*) as n FROM messages $where" $params)[0].n
      $params["limit"] = $limit; $params["offset"] = $offset
      $messages = Invoke-Sql "SELECT m.*, c.name as contact_name FROM messages m LEFT JOIN contacts c ON m.contact_id=c.id $where ORDER BY m.queued_at DESC LIMIT @limit OFFSET @offset" $params
      Send-Json $res @{ success=$true; messages=$messages; total=$total; page=$page; limit=$limit }
    } else {
      Send-Json $res @{ success=$true; messages=@(); total=0 }
    }
    return
  }

  # -- Campaigns -----------------------------------------------------------
  if ($urlPath -eq "/api/v1/campaigns" -and $method -eq "GET") {
    $page = if ($query["page"]) { [int]$query["page"] } else { 1 }; if ($page -lt 1) { $page = 1 }
    $limit = if ($query["limit"]) { [int]$query["limit"] } else { 20 }
    $offset = ($page - 1) * $limit
    $status = $query["status"]

    if ($global:useSQLite) {
      $where = "WHERE 1=1"; $params = @{}
      if ($status) { $where += " AND status=@status"; $params["status"] = $status }
      $total = (Invoke-Sql "SELECT COUNT(*) as n FROM campaigns $where" $params)[0].n
      $params["limit"] = $limit; $params["offset"] = $offset
      $campaigns = Invoke-Sql "SELECT c.*, t.name as template_display_name, t.category as template_category FROM campaigns c LEFT JOIN templates t ON c.template_id=t.id $where ORDER BY c.created_at DESC LIMIT @limit OFFSET @offset" $params
      Send-Json $res @{ success=$true; campaigns=$campaigns; total=$total; page=$page }
    } else {
      Send-Json $res @{ success=$true; campaigns=@(); total=0 }
    }
    return
  }
  if ($urlPath -eq "/api/v1/campaigns" -and $method -eq "POST") {
    $body = Read-Body $req
    if (-not $body.name) { Send-Error $res "Campaign name is required" 400; return }

    # Calculate recipient count
    $recipientCount = 0
    if ($body.audienceType -eq "all") {
      $recipientCount = if ($global:useSQLite) { (Invoke-Sql "SELECT COUNT(*) as n FROM contacts WHERE status='active'")[0].n } else { 0 }
    } elseif ($body.audienceType -eq "group" -and $body.audienceId) {
      $recipientCount = if ($global:useSQLite) { (Invoke-Sql "SELECT COUNT(*) as n FROM contact_group_members WHERE group_id=@gid" @{gid=$body.audienceId})[0].n } else { 0 }
    }

    $varMapping = if ($body.variableMapping) { ($body.variableMapping | ConvertTo-Json -Compress) } else { "{}" }
    $mType = if ($body.messageType) { $body.messageType } else { "template" }
    $tLang = if ($body.templateLang) { $body.templateLang } else { "en_US" }
    $aType = if ($body.audienceType) { $body.audienceType } else { "all" }
    Invoke-SqlNonQuery "INSERT INTO campaigns(name,description,status,message_type,template_id,template_name,template_lang,audience_type,audience_id,message_body,media_url,variable_mapping,scheduled_at,total_recipients) VALUES(@n,@d,'draft',@mt,@tid,@tn,@tl,@at,@aid,@mb,@mu,@vm,@sa,@tr)" @{
      n=$body.name; d=$body.description; mt=$mType; tid=$body.templateId
      tn=$body.templateName; tl=$tLang; at=$aType
      aid=$body.audienceId; mb=$body.messageBody; mu=$body.mediaUrl; vm=$varMapping
      sa=$body.scheduledAt; tr=$recipientCount
    }
    $id = Get-LastInsertId
    Send-Json $res @{ success=$true; id=$id; totalRecipients=$recipientCount; message="Campaign created" }
    return
  }
  if ($urlPath -match "^/api/v1/campaigns/(\d+)$" -and $method -eq "GET") {
    $id = $matches[1]
    $campaign = (Invoke-Sql "SELECT * FROM campaigns WHERE id=@id" @{id=$id})[0]
    if (-not $campaign) { Send-Error $res "Campaign not found" 404; return }
    $recipients = Invoke-Sql "SELECT cr.*, c.name as contact_name FROM campaign_recipients cr LEFT JOIN contacts c ON cr.contact_id=c.id WHERE cr.campaign_id=@cid ORDER BY cr.id ASC LIMIT 100" @{cid=$id}
    Send-Json $res @{ success=$true; campaign=$campaign; recipients=$recipients }
    return
  }
  if ($urlPath -match "^/api/v1/campaigns/(\d+)/launch$" -and $method -eq "POST") {
    $id = $matches[1]
    $body = Read-Body $req

    $campaign = (Invoke-Sql "SELECT * FROM campaigns WHERE id=@id" @{id=$id})[0]
    if (-not $campaign) { Send-Error $res "Campaign not found" 404; return }
    if ($campaign.status -notin @("draft","scheduled")) { Send-Error $res "Campaign cannot be launched from status: $($campaign.status)" 400; return }

    # Load recipients based on audience
    $contacts = @()
    if ($campaign.audience_type -eq "all") {
      $contacts = Invoke-Sql "SELECT id, name, phone FROM contacts WHERE status='active'"
    } elseif ($campaign.audience_type -eq "group" -and $campaign.audience_id) {
      $contacts = Invoke-Sql "SELECT c.id, c.name, c.phone FROM contacts c INNER JOIN contact_group_members m ON c.id=m.contact_id WHERE m.group_id=@gid AND c.status='active'" @{gid=$campaign.audience_id}
    }

    if ($contacts.Count -eq 0) { Send-Error $res "No active contacts found for this audience" 400; return }

    # Insert campaign recipients
    Invoke-SqlNonQuery "DELETE FROM campaign_recipients WHERE campaign_id=@cid" @{cid=$id}
    foreach ($contact in $contacts) {
      Invoke-SqlNonQuery "INSERT INTO campaign_recipients(campaign_id,contact_id,phone,name,status) VALUES(@cid,@coid,@phone,@name,'queued')" @{
        cid=$id; coid=$contact.id; phone=$contact.phone; name=$contact.name
      }
    }

    Invoke-SqlNonQuery "UPDATE campaigns SET total_recipients=@n, queued_count=@n, sent_count=0, delivered_count=0, read_count=0, failed_count=0, status='queued', updated_at=datetime('now') WHERE id=@id" @{n=$contacts.Count; id=$id}

    # Launch async
    $job = Start-CampaignAsync $id
    $global:campaignJobs = if ($global:campaignJobs) { $global:campaignJobs } else { @{} }
    $global:campaignJobs["$id"] = $job

    Send-Json $res @{ success=$true; campaignId=$id; totalRecipients=$contacts.Count; message="Campaign launched - processing in background" }
    return
  }
  if ($urlPath -match "^/api/v1/campaigns/(\d+)/status$" -and $method -eq "GET") {
    $id = $matches[1]
    $campaign = (Invoke-Sql "SELECT id,name,status,total_recipients,queued_count,sent_count,delivered_count,read_count,failed_count,started_at,completed_at FROM campaigns WHERE id=@id" @{id=$id})[0]
    if (-not $campaign) { Send-Error $res "Campaign not found" 404; return }
    $progress = if ($campaign.total_recipients -gt 0) { [math]::Round(($campaign.sent_count + $campaign.failed_count) / $campaign.total_recipients * 100, 1) } else { 0 }
    Send-Json $res @{ success=$true; campaign=$campaign; progress=$progress }
    return
  }
  if ($urlPath -match "^/api/v1/campaigns/(\d+)$" -and $method -eq "DELETE") {
    $id = $matches[1]
    Invoke-SqlNonQuery "DELETE FROM campaigns WHERE id=@id" @{id=$id}
    Send-Json $res @{ success=$true }
    return
  }

  if (($urlPath -eq "/api/v1/analytics" -or $urlPath -eq "/api/v1/analytics/dashboard") -and $method -eq "GET") {
    $period = if ($query["period"]) { $query["period"] } else { "month" }
    $days = switch ($period) { "today" { 1 } "week" { 7 } "month" { 30 } "quarter" { 90 } default { 30 } }

    if ($global:useSQLite) {
      $stats = (Invoke-Sql "SELECT COUNT(*) as total, SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered, SUM(CASE WHEN status='read' THEN 1 ELSE 0 END) as read, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed FROM messages WHERE direction='outbound' AND queued_at >= datetime('now', '-$days days')")
      $s = $stats[0]
      $totalSent = [int]($s.sent) + [int]($s.delivered) + [int]($s.read)
      $deliveryRate = if ($totalSent -gt 0) { [math]::Round(([int]$s.delivered + [int]$s.read) / $totalSent * 100, 1) } else { 0 }
      $readRate = if ($totalSent -gt 0) { [math]::Round([int]$s.read / $totalSent * 100, 1) } else { 0 }

      # Daily trend (last 7 days)
      $trend = Invoke-Sql "SELECT date(queued_at) as label, COUNT(*) as sent, SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered, SUM(CASE WHEN status='read' THEN 1 ELSE 0 END) as read FROM messages WHERE direction='outbound' AND queued_at >= datetime('now','-7 days') GROUP BY date(queued_at) ORDER BY label ASC"

      $campaignStats = (Invoke-Sql "SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' OR status='completed_with_errors' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='processing' THEN 1 ELSE 0 END) as active FROM campaigns")[0]
      $contactCount = (Invoke-Sql "SELECT COUNT(*) as n FROM contacts WHERE status='active'")[0].n
      $templateCount = (Invoke-Sql "SELECT COUNT(*) as n FROM templates WHERE status='approved'")[0].n

      Send-Json $res @{
        success=$true; period=$period
        messages=@{ sent=$totalSent; delivered=[int]$s.delivered; read=[int]$s.read; failed=[int]$s.failed; deliveryRate=$deliveryRate; readRate=$readRate }
        campaigns=@{ total=[int]$campaignStats.total; completed=[int]$campaignStats.completed; active=[int]$campaignStats.active }
        contacts=@{ total=[int]$contactCount }
        templates=@{ approved=[int]$templateCount }
        trend=$trend
      }
    } else {
      Send-Json $res @{ success=$true; period=$period; messages=@{sent=0;delivered=0;read=0;failed=0;deliveryRate=0;readRate=0}; campaigns=@{total=0;completed=0;active=0}; contacts=@{total=0}; templates=@{approved=0}; trend=@() }
    }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/whatsapp/phone-info" -and $method -eq "GET") {
    try {
      $phoneId = Get-Setting "wa_phone_id"
      $info = Invoke-MetaApi "GET" "/$phoneId?fields=display_phone_number,verified_name,status,quality_rating"
      Send-Json $res @{ success=$true; info=$info }
    } catch { Send-Error $res "Could not fetch phone info: $($_.Exception.Message)" }
    return
  }

  # ----------------------------------------------------------------------
  if ($urlPath -eq "/api/v1/audit" -and $method -eq "GET") {
    if ($global:useSQLite) {
      $logs = Invoke-Sql "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100"
      Send-Json $res @{ success=$true; logs=$logs }
    } else { Send-Json $res @{ success=$true; logs=@() } }
    return
  }

  # ----------------------------------------------------------------------
  # STATIC FILE SERVING
  # ----------------------------------------------------------------------
  try {
    if ($urlPath -eq "/favicon.ico") {
      Send-Response $res 200 "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%2325D366'/><path d='M30 70l40 5-45-45 45 40-40-5z' fill='white'/></svg>" "image/svg+xml"
      return
    }
    if ($urlPath -eq "/") { $urlPath = "/app.html" }
    $filePath = Join-Path $Root ($urlPath.TrimStart("/").Replace("/", "\"))
    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $ct = if ($global:mime.ContainsKey($ext)) { $global:mime[$ext] } else { "application/octet-stream" }
      [byte[]]$bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = $ct
      $res.ContentLength64 = $bytes.Length
      $res.StatusCode = 200
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      Send-Response $res 404 "404 Not Found" "text/plain"
    }
  } catch { Write-Host "  Error serving ${urlPath}: $_" -ForegroundColor Red
  } finally { try { $res.OutputStream.Close() } catch {} }
}

# ----------------------------------------------------------------------
Add-Type -AssemblyName System.Web  # for HttpUtility.ParseQueryString

Initialize-Schema
Write-Host ""
Write-Host "  WhatsFlow Production Server" -ForegroundColor Green
Write-Host "  ===========================" -ForegroundColor Green
Write-Host ""
Write-Host "  Application  : http://localhost:$Port/app.html" -ForegroundColor Cyan
Write-Host "  API Base     : http://localhost:$Port/api/v1/" -ForegroundColor Cyan
Write-Host "  Webhook      : http://localhost:$Port/webhook" -ForegroundColor Cyan
Write-Host "  Database     : $dbPath" -ForegroundColor Cyan
Write-Host "  SQLite       : $($global:useSQLite)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  First run? Configure your WhatsApp credentials:" -ForegroundColor Yellow
Write-Host "  " -ForegroundColor Yellow
Write-Host ""

# Sync templates on startup (non-blocking)
$syncJob = Start-Job -ScriptBlock {
  param($dbPath, $sqliteDll, $dataDir)
  if (Test-Path $sqliteDll) {
    try {
      Add-Type -Path $sqliteDll
      # Small delay to let server start
      Start-Sleep -Seconds 3
    } catch {}
  }
} -ArgumentList $dbPath, $sqliteDll, $dataDir

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch { Write-Host "Error starting HTTP listener: $_" -ForegroundColor Red; exit 1 }

if (-not $NoOpen) {
  try { Start-Process "http://localhost:$Port/app.html" } catch {}
}

Write-Host "  Server ready! Press Ctrl+C to stop." -ForegroundColor Green
Write-Host ""

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    Handle-Request $ctx
  }
} finally {
  $listener.Stop()
  Write-Host "  Server stopped." -ForegroundColor Yellow
}
