/**
 * Finanças Gaeta — Google Apps Script (Codigo.gs)
 * Backend Oficial de integração com o Google Sheets.
 *
 * Instruções:
 * 1. Abra sua Planilha no Google Sheets.
 * 2. Vá em Extensões -> Apps Script.
 * 3. Apague todo o código existente e cole o conteúdo abaixo.
 * 4. Clique em "Implantar" (Deploy) -> "Nova implantação" (New deployment).
 * 5. Tipo: "App da Web" (Web app).
 * 6. Executar como: "Eu" (Me).
 * 7. Quem tem acesso: "Qualquer pessoa" (Anyone).
 * 8. Copie a URL gerada e cole nas configurações do aplicativo.
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * FINANÇAS GAETA — GOOGLE APPS SCRIPT BACKEND (v1.0)
 * Sincronização segura, idempotente com LockService e IDs determinísticos.
 */

// Abas oficiais da Planilha
var SHEET_NAMES = [
  "1_Lancamentos",
  "4_Abastecimentos",
  "5_Contas_Bancarias",
  "6_Consultas_Médicas",
  "7_Receitas_Médicas",
  "8_Infracoes",
  "9_Veiculos",
  "10_Metas_De_Categoria",
  "11_Categorias_Customizadas",
  "12_Analises",
  "13_Perfil",
  "14_Oficina",
  "15_Manutenções_Agendadas",
  "16_Lista_De_Mercado",
  "17_Zonas_De_Risco",
  "18_Cartões_De_Crédito",
  "19_Agenda_E_Compromissos"
];

// Mapeamento de cabeçalhos por aba
var HEADERS_BY_SHEET = {
  "1_Lancamentos": [
    "Id",
    "Data",
    "Descrição",
    "Valor",
    "Valor_Pago",
    "Banco_Id",
    "Cartão_Id",
    "Forma_Pagamento",
    "Tipo",
    "Categoria",
    "Status",
    "KM",
    "Litros",
    "Preço_Litro",
    "Completou_O_Tanque",
    "KM_Percorrido",
    "Média_(Km/L)",
    "Veiculo",
    "Descrição_Do_Veículo",
    "Motorista",
    "Nome_Posto",
    "Localização_Do_Posto",
    "Comprovante_Url",
    "OBS"
  ],
  "4_Abastecimentos": ["Id", "Data", "Veiculo", "Km_Atual", "Km_Percorrido", "Litros", "Preco_Litro", "Valor_Total", "Posto", "Media_KmL", "Observacoes"],
  "5_Contas_Bancarias": ["Id", "Nome", "Saldo_Inicial", "Saldo_Atual", "Cor", "Ícone", "Tipo", "Agência", "Conta", "Limite", "Ativa"],
  "6_Consultas_Médicas": ["Id", "Especialidade", "Médico", "Data", "Horas", "Local", "Lembrete_Ativo", "Status", "Observação"],
  "7_Receitas_Médicas": ["Id", "Medicamento", "Dosagem", "Frequência", "Médico", "Data_Emissão", "Data_Validade", "Data_Vencimento", "Instruções", "Especialidade", "Observação", "Arquivo_Anexo", "Ativa"],
  "8_Infracoes": ["Id", "Protocolo", "Título", "Veículo", "Placa", "Data", "Descrição", "Valor", "Pontos", "Status", "Localização", "Observação"],
  "9_Veiculos": ["Id", "Descrição", "Motorista", "Placa", "Renavam", "Chassi", "Marca", "Modelo", "Ano", "Ano_Fabricação", "Combustível", "KM_Atual", "Ativo"],
  "10_Metas_De_Categoria": ["Id", "Categoria", "Valor_Meta", "Mes_Ano", "Alerta_Porcentagem"],
  "11_Categorias_Customizadas": ["Id", "Nome", "Tipo", "Icone", "Cor_Hex"],
  "12_Analises": ["Id", "Metrica", "Valor", "Data_Atualizacao", "Detalhes"],
  "13_Perfil": ["Id", "Nome", "Email", "Chave_Pix", "Moeda", "Ultima_Sincronizacao"],
  "14_Oficina": ["Id", "Data", "Descrição", "KM", "Valor_A_PG", "Valor_Pago", "Oficina_Nome", "Comprovante_Url", "Observações", "VeiculoID", "Veiculo"],
  "15_Manutenções_Agendadas": ["Id", "Veículo", "Descrição", "Tipo_Agendamento", "Data_Alvo", "KM_Alvo", "Recorrente", "Frequência_Meses", "Frequência_KM", "Status", "Prioridade", "Oficina_Nome", "Observações"],
  "16_Lista_De_Mercado": ["Id", "Item", "Categoria", "Quantidade", "Unidade", "Valor_Unitário", "Valor_Total", "Valor_Estimado", "Data_Pedido", "Data_Compra", "Comprado", "Observação"],
  "17_Zonas_De_Risco": ["Id", "Descrição", "Nível_De_Risco", "Latitude", "Longitude", "Raio_(M)", "Ativo", "Mensagem_De_Alerta", "Data_Registro", "Observação"],
  "18_Cartões_De_Crédito": ["Id", "Nome", "Limite", "Fechamento", "Vencimento", "Cor", "Banco_ID", "Gasto", "Ativo", "Bandeira"],
  "19_Agenda_E_Compromissos": ["Id", "Titulo", "Data", "Hora", "Descrição", "Cor_De_Identificação", "Efeito_Alerta_(Piscando)", "Lembrete_Ativo", "Dias_De_Antecedência", "Concluído", "Categoria"]
};

/**
 * Função de auxílio: Gerar ID determinístico para linhas sem ID preenchido.
 * NUNCA usa Date.now() nem número aleatório na leitura.
 */
function getDeterministicRowId(sheetName, rowIndex, rowData) {
  var rawString = sheetName + "_" + rowIndex + "_" + rowData.slice(1, 5).join("_");
  var hash = 0;
  for (var i = 0; i < rawString.length; i++) {
    var char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "DET_" + Math.abs(hash);
}

/**
 * Inicializar a planilha criando as abas faltantes e preenchendo cabeçalhos.
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEET_NAMES.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    var headers = HEADERS_BY_SHEET[sheetName];
    if (sheet.getLastRow() === 0 && headers) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  });
}

/**
 * Trata requisições GET (Leitura)
 */
function doGet(e) {
  try {
    setupSpreadsheet();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var paramSheet = e && e.parameter && e.parameter.sheet ? e.parameter.sheet : "1_Lancamentos";
    
    if (paramSheet === "ALL") {
      var allData = {};
      SHEET_NAMES.forEach(function(sheetName) {
        allData[sheetName] = readSheetRecords(ss, sheetName);
      });
      return createJsonResponse({ status: "success", data: allData });
    }

    var result = readSheetRecords(ss, paramSheet);
    return createJsonResponse({ status: "success", sheet: paramSheet, data: result });
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Erro de leitura: " + err.toString() });
  }
}

/**
 * Localiza aba de forma flexível (suporta variações de acentuação e maiúsculas/minúsculas)
 */
function findSheetFlexible(ss, sheetName) {
  var direct = ss.getSheetByName(sheetName);
  if (direct) return direct;
  
  var clean = function(s) {
    return String(s || "").toLowerCase().replace(/[áàãâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i").replace(/[óòõôö]/g, "o").replace(/[úùûü]/g, "u").replace(/[ç]/g, "c").replace(/[^a-z0-9]/g, "");
  };
  
  var targetClean = clean(sheetName);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (clean(sheets[i].getName()) === targetClean) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Lê registros de uma aba mantendo garantia de ID determinístico
 */
function readSheetRecords(ss, sheetName) {
  var sheet = findSheetFlexible(ss, sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Somente cabeçalhos ou vazia

  var headers = data[0];
  var records = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    // Ignorar linha em branco
    if (row.every(function(cell) { return cell === "" || cell === null; })) continue;

    var record = {};
    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      var value = row[c];

      // Preservar datas em colunas de data e números em colunas de números (como KM)
      if (value instanceof Date) {
        if (header.indexOf("Data") !== -1 || header.indexOf("Validade") !== -1 || header.indexOf("Garantia") !== -1) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          value = value.toISOString();
        }
      }
      record[header] = value;
    }

    // Regra 1 de IDs: Se ID não estiver preenchido na planilha, gerar ID determinístico e nunca dinâmico
    if (!record["Id"] || String(record["Id"]).trim() === "") {
      record["Id"] = getDeterministicRowId(sheetName, r + 1, row);
    }

    // Ignorar registros marcados como excluídos (soft delete)
    if (record["Status"] !== "Excluído" && record["Status"] !== "DELETED") {
      records.push(record);
    }
  }

  return records;
}

/**
 * Trata requisições POST (Escrita com UPSERT e LockService)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Tentar obter a trava por até 10 segundos para concorrência segura
    if (!lock.tryLock(10000)) {
      return createJsonResponse({
        status: "error",
        message: "Servidor ocupado. Outra gravação está em andamento. Tente novamente em alguns instantes."
      });
    }

    setupSpreadsheet();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    var sheetName = requestData.sheet || "1_Lancamentos";
    var action = requestData.action || "UPSERT"; // UPSERT ou SOFT_DELETE
    var items = requestData.items || (requestData.item ? [requestData.item] : []);

    if (!items || items.length === 0) {
      return createJsonResponse({ status: "error", message: "Nenhum item enviado para gravação." });
    }

    var resultCount = writeSheetRecords(ss, sheetName, items, action);

    // Regra especial: Espelhar lançamento de categoria ABASTECIMENTO para 4_Abastecimentos
    if (sheetName === "1_Lancamentos") {
      var fuelItems = items.filter(function(item) {
        return item.Categoria === "ABASTECIMENTO" || item.Tipo === "Abastecimento";
      });
      if (fuelItems.length > 0) {
        syncFuelMirror(ss, fuelItems);
      }
    }

    return createJsonResponse({
      status: "success",
      sheet: sheetName,
      action: action,
      updatedCount: resultCount
    });

  } catch (err) {
    return createJsonResponse({ status: "error", message: "Erro ao gravar na planilha: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lógica de UPSERT (Sem clearContents, sem deleteRow)
 */
function writeSheetRecords(ss, sheetName, items, action) {
  var sheet = findSheetFlexible(ss, sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var defaultHeaders = HEADERS_BY_SHEET[sheetName] || Object.keys(items[0]);
    sheet.appendRow(defaultHeaders);
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIndex = headers.indexOf("Id");

  if (idColIndex === -1) {
    headers.unshift("Id");
    sheet.getRange(1, 1).setValue("Id");
    data = sheet.getDataRange().getValues();
    idColIndex = 0;
  }

  // Mapear IDs existentes para números de linha
  var existingIdMap = {};
  for (var r = 1; r < data.length; r++) {
    var existingId = String(data[r][idColIndex]).trim();
    if (existingId) {
      existingIdMap[existingId] = r + 1; // 1-indexed row number
    }
  }

  var updated = 0;

  items.forEach(function(item) {
    // Garantir ID para o novo registro
    if (!item.Id) {
      item.Id = "GAETA_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    }

    if (action === "SOFT_DELETE") {
      item.Status = "Excluído";
    }

    var targetRow = existingIdMap[item.Id];

    // Se não encontrou por ID, tentar matching por Data + Descrição + Valor para evitar duplicados
    if (!targetRow && item.Data && item.Descricao && item.Valor) {
      for (var rowIdx = 1; rowIdx < data.length; rowIdx++) {
        var rowData = data[rowIdx];
        var rowDate = String(rowData[headers.indexOf("Data")] || "").substring(0, 10);
        var rowDesc = String(rowData[headers.indexOf("Descricao")] || "");
        var rowVal = parseFloat(rowData[headers.indexOf("Valor")] || 0);

        if (rowDate === String(item.Data).substring(0, 10) &&
            rowDesc === item.Descricao &&
            Math.abs(rowVal - parseFloat(item.Valor)) < 0.01) {
          targetRow = rowIdx + 1;
          item.Id = String(rowData[idColIndex]); // Usar ID da linha correspondente
          break;
        }
      }
    }

    var rowArray = headers.map(function(header) {
      var val = item[header];
      if (val === undefined || val === null) return "";
      return val;
    });

    if (targetRow) {
      // Atualizar linha existente
      sheet.getRange(targetRow, 1, 1, rowArray.length).setValues([rowArray]);
    } else {
      // Adicionar nova linha
      sheet.appendRow(rowArray);
    }
    updated++;
  });

  return updated;
}

/**
 * Espelhamento automático de 1_Lancamentos -> 4_Abastecimentos
 */
function syncFuelMirror(ss, fuelItems) {
  var mirrorItems = fuelItems.map(function(item) {
    var litros = parseFloat(item.Litros || 0);
    var valorTotal = parseFloat(item.Valor || 0);
    var precoLitro = parseFloat(item.Preco_Litro || (litros > 0 ? valorTotal / litros : 0));
    var kmAtual = parseFloat(item.Km_Atual || 0);

    return {
      Id: "ABAST_" + item.Id,
      Data: item.Data,
      Veiculo: item.Veiculo || "Veículo 1",
      Km_Atual: kmAtual,
      Km_Percorrido: 0,
      Litros: litros,
      Preco_Litro: precoLitro,
      Valor_Total: valorTotal,
      Posto: item.Posto || "",
      Media_KmL: 0,
      Observacoes: item.Observacoes || item.Descricao
    };
  });

  writeSheetRecords(ss, "4_Abastecimentos", mirrorItems, "UPSERT");
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
