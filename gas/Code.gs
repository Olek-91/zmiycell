// ══════════════════════════════════════════════════════════════
/**
 * zmiyCell OS Backend
 * Version: 2.1.3
 * Last Updated: 15.04.2026 20:38
 */

var VERSION = "2.1.3"
//  ZmiyCell — Google Apps Script  (Code.gs)
//  Vercel + проксі (api/gas.js)
//  GET: ?action=назваФункції&params=[...]
//
//  APP VERSION: 1.9-rounding-sorting
var APP_VERSION = "1.9-rounding-sorting";

//  НОВА АРХІТЕКТУРА СКЛАДУ:
//  Materials    — глобальний склад: id, name, unit, stock, photoUrl, isOrdered, shopUrl, minStock
//  TypeMaterials — конфігурація типу: id, typeId, matId, perBattery, minStock
// ══════════════════════════════════════════════════════════════

var SHEET = {
  CONFIG:    'Config',
  BATTERY:   'BatteryTypes',
  MATERIALS: 'Materials',
  TYPE_MATS: 'TypeMaterials',
  ASSEMBLIES:'Assemblies',
  ASSEM_COMP:'AssemblyComponents',
  WORKERS:   'Workers',
  TOOLS:     'Tools',
  TOOL_LOG:  'ToolLog',
  LOG:       'Log',
  REPAIR:    'RepairLog',
  PREP:      'PrepItems',
  PAYMENTS:  'Payments',
  ACTION_LOG:'ActionLogs',
  MAT_BACKUP:'MaterialsBackup',
  RADIO:     'RadioStations',
}

// Telegram — заповніть свої дані
var TG_TOKEN   = 'ВАШ_ТОКЕН_ТУТ'   // @BotFather
var TG_CHAT_ID = 'ВАШ_CHAT_ID_ТУТ' // @userinfobot або @getidsbot

// ── Telegram відправка ────────────────────────────────────────
function tgSend(text) {
  if (TG_TOKEN === 'ВСТАВТЕ_TOKEN') return
  try {
    var chunks = []
    var t = text
    while (t.length > 0) {
      if (t.length > 4000) {
        var limit = t.lastIndexOf('\\n', 4000)
        if (limit === -1) limit = 4000
        chunks.push(t.substring(0, limit))
        t = t.substring(limit).trim()
      } else {
        chunks.push(t)
        t = ''
      }
    }
    
    for (var i=0; i<chunks.length; i++) {
      UrlFetchApp.fetch(
        'https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage',
        {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            chat_id: TG_CHAT_ID,
            text: chunks[i],
            parse_mode: 'HTML',
            disable_web_page_preview: false
          })
        }
      )
    }
  } catch(e) { Logger.log('TG error: ' + e.message) }
}

function sendTelegramAction(text) {
  tgSend(text)
  return { ok: true }
}

// ── Точка входу GET ───────────────────────────────────────────
function getBackendInfo() {
  return {
    version: VERSION || "unknown",
    lastUpdated: "15.04.2026 20:41",
    status: "online"
  };
}

function doGet(e) {
  var result
  try {
    var action = e.parameter.action || ''
    var params = e.parameter.params
      ? JSON.parse(e.parameter.params)
      : []

    var fn = ACTIONS[action]
    if (!fn) throw new Error('Unknown action: ' + action)

    result = fn.apply(null, params)
    if (result === undefined) result = { ok: true }

  } catch (err) {
    result = { ok: false, error: err.message }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Точка входу POST (для великих payload-ів) ─────────────────
function doPost(e) {
  var result
  try {
    var body = JSON.parse(e.postData.contents)
    var action = body.action || e.parameter.action || ''
    var params = body.params || []

    var fn = ACTIONS[action]
    if (!fn) throw new Error('Unknown action: ' + action)

    result = fn.apply(null, params)
    if (result === undefined) result = { ok: true }

  } catch (err) {
    result = { ok: false, error: err.message }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── Таблиця дій ──────────────────────────────────────────────

var ACTIONS = {
  loadAll:                loadAll,
  initSheets:             initSheets,

  // Матеріали (глобальний склад)
  addMaterial:            addMaterial,
  updateMaterialField:    updateMaterialField,
  updateMaterialStock:    updateMaterialStock,
  deleteMaterial:         deleteMaterial,

  // Прив'язка матеріалів до типів
  addTypeMaterial:        addTypeMaterial,
  updateTypeMaterial:     updateTypeMaterial,
  removeTypeMaterial:     removeTypeMaterial,

  // Виробництво / ремонт / заготовка
  writeOff:               writeOff,
  addPrepItem:            addPrepItem,
  addPrepItemsBatch:      addPrepItemsBatch,
  addPrepItemsDirect:     addPrepItemsDirect,
  updatePrepField:        updatePrepField,
  returnPrep:             returnPrep,
  issueConsumable:        issueConsumable,
  addRepair:              addRepair,
  addProductionEntry:     writeOff,
  produceBatteries:       writeOff,
  updateRepairStatus:     updateRepairStatus,
  getBackendInfo:         getBackendInfo,
  returnRepairMaterials:  returnRepairMaterials,
  deleteRepair:           deleteRepair,

  // Типи батарей
  addBatteryType:         addBatteryType,
  updateBatteryTypeField: updateBatteryTypeField,

  // Працівники
  saveWorker:             saveWorker,
  deleteWorker:           deleteWorker,
  addPayment:             addPayment,

  // Інструменти
  saveTool:               saveTool,
  deleteTool:             deleteTool,
  reportToolRepair:       reportToolRepair,
  logToolEvent:           logToolEvent,

  // Збірки (напівфабрикати)
  addAssembly:            addAssembly,
  updateAssemblyField:    updateAssemblyField,
  deleteAssembly:         deleteAssembly,
  addAssemblyComponent:   addAssemblyComponent,
  updateAssemblyComponent:updateAssemblyComponent,
  removeAssemblyComponent:removeAssemblyComponent,
  saveAssemblyComponents: saveAssemblyComponents,
  undoAction:             undoAction,
  produceAssembly:        produceAssembly,
  produceAssemblyAdvanced: produceAssemblyAdvanced,

  // Лог дій
  logAction:              logAction,
  logPrepEntry:           logPrepEntry,
  getActionLogs:          getActionLogs,

  // Бекап матеріалів
  saveStockBackup:        saveStockBackup,
  getBackupDiff:          getBackupDiff,
  restoreFromBackup:      restoreFromBackup,

  saveRadioStation:        saveRadioStation,
  deleteRadioStation:      deleteRadioStation,
  sendTelegram:           sendTelegramAction,
}

function withLock(fn) {
  var lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try { return fn() }
  finally { lock.releaseLock() }
}

// ══════════════════════════════════════════════════════════════
//  ІНІЦІАЛІЗАЦІЯ — запустити вручну один раз (нова схема)
// ══════════════════════════════════════════════════════════════
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  ensureSheet(ss, SHEET.CONFIG,
    ['key', 'value'],
    [['initialized', new Date().toISOString()]]
  )

  ensureSheet(ss, SHEET.BATTERY,
    ['id', 'name', 'color', 'manual'],
    [
      ['typeA', '16S3P 230Ah SK Innovation', '#f97316', ''],
      ['typeB', '15S1P 150Ah CATL',          '#06b6d4', ''],
    ]
  )

  // Глобальний склад — без typeId і perBattery
  ensureSheet(ss, SHEET.MATERIALS,
    ['id', 'name', 'unit', 'stock', 'photoUrl', 'isOrdered', 'shopUrl', 'minStock'],
    buildDefaultMaterials()
  )
  ensureColumn(ss.getSheetByName(SHEET.MATERIALS), 'minStock')

  // Конфігурація типів
  ensureSheet(ss, SHEET.TYPE_MATS,
    ['id', 'typeId', 'matId', 'perBattery', 'minStock'],
    []
  )

  // Збірки (напівфабрикати)
  ensureSheet(ss, SHEET.ASSEMBLIES,
    ['id', 'name', 'outputMatId', 'outputQty', 'unit', 'notes', 'manual', 'isUniversal'],
    []
  )
  ensureSheet(ss, SHEET.ASSEM_COMP,
    ['id', 'assemblyId', 'matId', 'qty'],
    []
  )

  ensureSheet(ss, SHEET.WORKERS,
    ['id', 'name', 'color'],
    [
      ['w1', 'Іваненко О.', ''], ['w2', 'Петренко В.', ''],
      ['w3', 'Сидоренко М.', ''], ['w4', 'Коваленко Т.', ''],
      ['w5', 'Бойченко Р.', ''], ['w6', 'Мельник Д.', ''],
    ]
  )
  ensureColumn(ss.getSheetByName(SHEET.WORKERS), 'color')

  ensureSheet(ss, SHEET.ACTION_LOG,
    ['id', 'date', 'datetime', 'user', 'actionType', 'details'],
    []
  )

  ensureSheet(ss, SHEET.MAT_BACKUP,
    ['matId', 'name', 'unit', 'stock', 'snapshotDate'],
    []
  )

  ensureSheet(ss, SHEET.TOOLS,
    ['id', 'name', 'category', 'count', 'working', 'serial', 'notes', 'repairNote', 'repairDate'],
    [
      ['t1', 'Зварювальний апарат точковий', 'equipment', 2, 2, 'SW-001', '', '', ''],
      ['t2', 'Паяльна станція',              'tool',      4, 4, '',       '', '', ''],
      ['t3', 'Мультиметр',                   'tool',      3, 3, '',       '', '', ''],
      ['t4', 'Аналізатор ємності',           'equipment', 2, 1, 'CA-002', '1 на ремонті', '', ''],
      ['t5', 'Термофен',                     'tool',      3, 3, '',       '', '', ''],
    ]
  )

  ensureSheet(ss, SHEET.TOOL_LOG,
    ['id','toolId','toolName','date','datetime','event','workerName','note'],
    []
  )

  ensureSheet(ss, SHEET.LOG,
    ['id','datetime','date','typeId','typeName','workerName','count','serials','consumedJson','kind','repairNote'],
    []
  )

  ensureSheet(ss, SHEET.REPAIR,
    ['id','datetime','date','serial','typeName','typeId','originalWorker','repairWorker','note','materialsJson','status','photoUrl'],
    []
  )
  ensureColumn(ss.getSheetByName(SHEET.REPAIR), 'photoUrl')

  ensureSheet(ss, SHEET.PREP,
    ['id','workerId','workerName','typeId','matId','matName','unit','qty','returnedQty','date','datetime','status','scope'],
    []
  )
  ensureColumn(ss.getSheetByName(SHEET.PREP), 'scope')
  ensureSheet(ss, SHEET.PAYMENTS,
    ['id','workerId','workerName','count','date','datetime'],
    []
  )

  // ACTION_LOG вже ініціалізовано вище з заголовком 'actionType'

  ensureSheet(ss, SHEET.RADIO,
    ['id', 'name', 'url'],
    [
      ['r1', 'Radio Paradise (Rock)',       'https://stream.radioparadise.com/rock-128'],
      ['r2', 'Radio Paradise (Main)',       'https://stream.radioparadise.com/mp3-128'],
      ['r3', 'KEXP 90.3 FM (Seattle)',      'https://kexp-mp3-128.streamguys1.com/kexp128.mp3'],
      ['r4', 'FIP (France — Rock/Indie)',   'https://icecast.radiofrance.fr/fiprock-midfi.mp3'],
      ['r5', 'SomaFM (Metal Detector)',     'https://ice1.somafm.com/metal-128-mp3'],
      ['r6', 'SomaFM (Indie Pop)',          'https://ice1.somafm.com/indiepop-128-mp3'],
      ['r7', 'Wacken Radio (Metal)',        'https://wacken.stream.publicradio.de/wacken_live'],
      ['r8', 'Radio ROKS (Україна)',        'https://online.radioroks.ua/RadioROKS_H'],
      // +10 нових жанрів, без реклами
      ['r9',  'SomaFM (Groove Salad — Ambient/Chillout)',    'https://ice1.somafm.com/groovesalad-128-mp3'],
      ['r10', 'SomaFM (Drone Zone — Dark Ambient)',          'https://ice1.somafm.com/dronezone-128-mp3'],
      ['r11', 'SomaFM (Beat Blender — Deep House)',          'https://ice1.somafm.com/beatblender-128-mp3'],
      ['r12', 'SomaFM (Illinois St. Lounge — Jazz)',         'https://ice1.somafm.com/illstreet-128-mp3'],
      ['r13', 'SomaFM (Folk Forward — Folk/Acoustic)',       'https://ice1.somafm.com/folkfwd-128-mp3'],
      ['r14', 'SomaFM (Boot Liquor — Americana/Roots)',      'https://ice1.somafm.com/bootliquor-128-mp3'],
      ['r15', 'SomaFM (Deep Space One — Space/Ambient)',     'https://ice1.somafm.com/deepspaceone-128-mp3'],
      ['r16', 'Radio Swiss Jazz',                            'https://stream.srg-ssr.ch/m/rsj/mp3_128'],
      ['r17', 'Radio Swiss Classic',                         'https://stream.srg-ssr.ch/m/rsc_de/mp3_128'],
      ['r18', 'WFMU (Freeform/Eclectic — NYC)',              'https://stream.wfmu.org/fmradio.mp3'],
    ]
  )

  return { ok: true, message: 'Ініціалізацію завершено' }
}

function ensureSheet(ss, name, headers, dataRows) {
  var sh = ss.getSheetByName(name)
  if (!sh) {
    sh = ss.insertSheet(name)
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
    if (dataRows.length) {
      sh.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows)
    }
  }
  return sh
}

function ensureColumn(sh, header) {
  if (!sh) return 0
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  var idx = headers.indexOf(header)
  if (idx < 0) {
    sh.getRange(1, headers.length + 1).setValue(header)
    return headers.length + 1
  }
  return idx + 1
}

// ══════════════════════════════════════════════════════════════
//  ЗАВАНТАЖЕННЯ ВСІХ ДАНИХ
// ══════════════════════════════════════════════════════════════
function loadAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  var btRows  = rows(ss, SHEET.BATTERY)
  var matRows = rows(ss, SHEET.MATERIALS)
  var tmRows  = rows(ss, SHEET.TYPE_MATS)
  var wRows   = rows(ss, SHEET.WORKERS)
  var tRows   = rows(ss, SHEET.TOOLS)
  var lRows   = rows(ss, SHEET.LOG)
  var rRows   = rows(ss, SHEET.REPAIR)
  var pRows   = rows(ss, SHEET.PREP)
  var payRows = rows(ss, SHEET.PAYMENTS)
  var tlRows  = rows(ss, SHEET.TOOL_LOG)

  var materials = matRows.map(function(m) {
    return {
      id:        m.id,
      name:      m.name,
      unit:      m.unit,
      stock:     num(m.stock),
      photoUrl:  m.photoUrl  || null,
      isOrdered: m.isOrdered === 'true' || m.isOrdered === true,
      shopUrl:   m.shopUrl   || '',
      minStock:  num(m.minStock),
    }
  })

  var typeMaterials = tmRows.map(function(tm) {
    return {
      id:         tm.id,
      typeId:     tm.typeId,
      matId:      tm.matId,
      perBattery: num(tm.perBattery),
      minStock:   num(tm.minStock),
    }
  })

  var batteryTypes = btRows.map(function(bt) {
    return {
      id:     bt.id,
      name:   bt.name,
      color:  bt.color  || '#f97316',
      manual: bt.manual || '',
    }
  })

  // Збираємо матеріали всередині типів (backward compatible)
  var matById = {}
  materials.forEach(function(m) { matById[m.id] = m })
  var tmByType = {}
  typeMaterials.forEach(function(tm) {
    if (!tmByType[tm.typeId]) tmByType[tm.typeId] = []
    tmByType[tm.typeId].push(tm)
  })
  batteryTypes = batteryTypes.map(function(bt) {
    var mats = (tmByType[bt.id] || []).map(function(tm) {
      var base = matById[tm.matId] || { id: tm.matId, name: '', unit: '', stock: 0, photoUrl: '', isOrdered: false, shopUrl: '' }
      return {
        id: tm.matId,
        name: base.name,
        unit: base.unit,
        stock: num(base.stock),
        photoUrl: base.photoUrl || null,
        isOrdered: base.isOrdered || false,
        shopUrl: base.shopUrl || '',
        perBattery: tm.perBattery,
        minStock: tm.minStock,
      }
    })
    return {
      id: bt.id,
      name: bt.name,
      color: bt.color,
      manual: bt.manual,
      materials: mats,
    }
  })

  var asRows   = rows(ss, SHEET.ASSEMBLIES)
  var acRows   = rows(ss, SHEET.ASSEM_COMP)

  var assemblies = asRows.map(function(a) {
    var dest = String(a.defDest || a.isUniversal || 'stock')
    if (dest === 'true' || dest === 'false') dest = 'stock'

    return {
      id:          a.id,
      name:        a.name,
      outputMatId: a.outputMatId,
      outputQty:   num(a.outputQty),
      unit:        a.unit || '',
      notes:       a.notes || '',
      manual:      a.manual || '',
      defDest:     dest,
      components:  acRows
        .filter(function(ac) { return ac.assemblyId === a.id })
        .map(function(ac) { return { id:ac.id, assemblyId:ac.assemblyId, matId:ac.matId, qty:num(ac.qty) } }),
    }
  })

  return {
    ok: true,
    batteryTypes:  batteryTypes,
    materials:     materials,
    typeMaterials: typeMaterials,
    assemblies:    assemblies,

    workers: wRows.map(function(r) {
      return { id: r.id, name: r.name, color: r.color || '' }
    }),

    tools: tRows.map(function(r) {
      return {
        id:         r.id,
        name:       r.name,
        category:   r.category,
        count:      int(r.count),
        working:    int(r.working),
        serial:     r.serial     || '',
        notes:      r.notes      || '',
        repairNote: r.repairNote || '',
        repairDate: r.repairDate || '',
      }
    }),

    log: lRows.map(function(r) {
      return {
        id:         r.id,
        datetime:   r.datetime,
        date:       r.date,
        typeId:     r.typeId,
        typeName:   r.typeName,
        workerName: r.workerName,
        count:      int(r.count),
        serials:    r.serials ? r.serials.split('|') : [],
        consumed:   json(r.consumedJson, []),
        kind:       r.kind || 'production',
        repairNote: r.repairNote || '',
      }
    }).reverse(),

    repairLog: rRows.map(function(r) {
      return {
        id:             r.id,
        datetime:       r.datetime,
        date:           r.date,
        serial:         r.serial,
        typeName:       r.typeName,
        typeId:         r.typeId,
        originalWorker: r.originalWorker,
        repairWorker:   r.repairWorker,
        note:           r.note || '',
        materials:      json(r.materialsJson, []),
        status:         r.status || 'completed',
        photoUrl:       r.photoUrl || '',
      }
    }).reverse(),

  prepItems: pRows.map(function(r) {
      return {
        id:          r.id,
        workerId:    r.workerId,
        workerName:  r.workerName,
        typeId:      r.typeId,
        matId:       r.matId,
        matName:     r.matName,
        unit:        r.unit,
        qty:         num(r.qty),
        returnedQty: num(r.returnedQty),
        date:        r.date,
        datetime:    r.datetime,
        status:      r.status || 'active',
        scope:       r.scope || 'self',
      }
    }),
    payments: payRows.map(function(r) {
      return {
        id: r.id,
        workerId: r.workerId,
        workerName: r.workerName,
        count: int(r.count),
        date: r.date,
        datetime: r.datetime,
      }
    }).reverse(),

    toolLog: tlRows.map(function(r) {
      return {
        id: r.id,
        toolId: r.toolId,
        toolName: r.toolName,
        date: r.date,
        datetime: r.datetime,
        event: r.event,
        workerName: r.workerName,
        note: r.note || '',
      }
    }).reverse(),
    
    radioStations: rows(ss, SHEET.RADIO).map(function(r) {
      return { id: r.id, name: r.name, url: r.url }
    }),
    version: VERSION
  }
}

// ══════════════════════════════════════════════════════════════
//  МАТЕРІАЛИ (глобальний склад)
//  Колонки: 1:id 2:name 3:unit 4:stock 5:photoUrl 6:isOrdered 7:shopUrl 8:minStock
// ══════════════════════════════════════════════════════════════
function addMaterial(name, unit, stock, minStock, shopUrl, photoUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ensureSheet(ss, SHEET.MATERIALS, ['id', 'name', 'unit', 'stock', 'photoUrl', 'isOrdered', 'shopUrl', 'minStock'], [])
  ensureColumn(sh, 'minStock')

  var nameNew = name
  var unitNew = unit
  var stockNew = num(stock)
  var minStockNew = num(minStock)
  var shopUrlNew = shopUrl || ''
  var photoUrlNew = photoUrl || ''
  var id = 'mat_' + Date.now()
  sh.appendRow([id, nameNew, unitNew, stockNew, photoUrlNew, false, shopUrlNew, minStockNew])
  return { ok: true, id: id }
}

function updateMaterialField(a, b, c, d) {
  var typeId, matId, field, value
  if (d === undefined) {
    matId = a; field = b; value = c
  } else {
    typeId = a; matId = b; field = c; value = d
  }

  if ((field === 'perBattery' || field === 'minStock') && typeId) {
    return updateTypeMaterialByMat(typeId, matId, field, value)
  }

  var colMap = { name: 2, unit: 3, stock: 4, photoUrl: 5, isOrdered: 6, shopUrl: 7, minStock: 8 }
  var col = colMap[field]

  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.MATERIALS)
  ensureColumn(sh, 'minStock')
  var data = sh.getDataRange().getValues()
  if (!col) {
    var headers = data[0]
    var idx = headers.indexOf(field)
    if (idx >= 0) col = idx + 1
  }
  if (!col) return { ok: false, error: 'Невідоме поле: ' + field }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(matId)) {
      sh.getRange(i + 1, col).setValue(value)
      return { ok: true }
    }
  }
  return { ok: false, error: 'Матеріал не знайдено' }
}

function updateMaterialStock(a, b, c) {
  var matId, delta
  if (c === undefined) { matId = a; delta = b } else { matId = b; delta = c }

  return withLock(function() {
    var ss   = SpreadsheetApp.getActiveSpreadsheet()
    var sh   = ss.getSheetByName(SHEET.MATERIALS)
    var data = sh.getDataRange().getValues()
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(matId)) {
        // Захист від критичних помилок (ID замість кількості)
        if (Math.abs(delta) > 1000000) {
          return { ok: false, error: 'Suspicious stock delta: ' + delta }
        }
        var newVal = +((+data[i][3] || 0) + delta).toFixed(2)
        sh.getRange(i + 1, 4).setValue(newVal)
        return { ok: true, stock: newVal }
      }
    }
    return { ok: false, error: 'Матеріал не знайдено' }
  })
}

function deleteMaterial(a, b) {
  var matId = (b === undefined) ? a : b
  // Спочатку видаляємо всі прив'язки TypeMaterials
  var ss     = SpreadsheetApp.getActiveSpreadsheet()
  var tmSh   = ss.getSheetByName(SHEET.TYPE_MATS)
  var tmData = tmSh.getDataRange().getValues()
  for (var i = tmData.length - 1; i >= 1; i--) {
    if (String(tmData[i][2]) === String(matId)) {
      tmSh.deleteRow(i + 1)
    }
  }
  return deleteRowWhere(SHEET.MATERIALS, function(r) {
    return String(r[0]) === String(matId)
  })
}

// ══════════════════════════════════════════════════════════════
//  TYPE MATERIALS — конфігурація типу батареї
//  Колонки: 1:id 2:typeId 3:matId 4:perBattery 5:minStock
// ══════════════════════════════════════════════════════════════
function addTypeMaterial(typeId, matId, perBattery, minStock) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var tmSh = ss.getSheetByName(SHEET.TYPE_MATS)
  if (!tmSh) {
    tmSh = ss.insertSheet(SHEET.TYPE_MATS)
    tmSh.getRange(1,1,1,5).setValues([['id','typeId','matId','perBattery','minStock']])
  }
  // Перевіряємо дублікат
  var data = tmSh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(typeId) && String(data[i][2]) === String(matId)) {
      return { ok: false, error: 'Цей матеріал вже є в типі' }
    }
  }
  var id = 'tm_' + Date.now()
  tmSh.appendRow([id, typeId, matId, num(perBattery), num(minStock)])
  return { ok: true, id: id }
}

function ensureTypeMaterial(typeId, matId, perBattery, minStock) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var tmSh = ss.getSheetByName(SHEET.TYPE_MATS)
  if (!tmSh) {
    tmSh = ss.insertSheet(SHEET.TYPE_MATS)
    tmSh.getRange(1,1,1,5).setValues([['id','typeId','matId','perBattery','minStock']])
  }
  var data = tmSh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(typeId) && String(data[i][2]) === String(matId)) {
      return { ok: true, id: data[i][0] }
    }
  }
  var id = 'tm_' + Date.now()
  tmSh.appendRow([id, typeId, matId, num(perBattery), num(minStock)])
  return { ok: true, id: id }
}

function updateTypeMaterial(tmId, field, value) {
  var colMap = { perBattery: 4, minStock: 5 }
  var col = colMap[field]
  if (!col) return { ok: false, error: 'Невідоме поле: ' + field }

  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.TYPE_MATS)
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(tmId)) {
      sh.getRange(i + 1, col).setValue(num(value))
      return { ok: true }
    }
  }
  return { ok: false, error: 'Запис не знайдено' }
}

function updateTypeMaterialByMat(typeId, matId, field, value) {
  if (!typeId) return { ok: false, error: 'Невідомий typeId' }
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.TYPE_MATS)
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(typeId) && String(data[i][2]) === String(matId)) {
      var col = field === 'perBattery' ? 4 : 5
      sh.getRange(i + 1, col).setValue(num(value))
      return { ok: true }
    }
  }
  return { ok: false, error: 'Запис не знайдено' }
}

function removeTypeMaterial(tmId) {
  return deleteRowWhere(SHEET.TYPE_MATS, function(r) {
    return String(r[0]) === String(tmId)
  })
}

// ══════════════════════════════════════════════════════════════
//  СПИСАННЯ (ВИРОБНИЦТВО)
//  entry.consumed: [{ matId, name, unit, amount, fromStock, fromPersonal, fromTeam }]
// ══════════════════════════════════════════════════════════════
function writeOff(entry) {
  return withLock(function() {
    var ss      = SpreadsheetApp.getActiveSpreadsheet()
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var matData = matSh.getDataRange().getValues()
    entry.consumed = decompressConsumed(entry.consumed, matData)

    entry.consumed.forEach(function(c) {
      var fromStock = c.fromStock !== undefined ? c.fromStock : c.amount
      if (!fromStock || fromStock <= 0) return
      for (var i = 1; i < matData.length; i++) {
        if (String(matData[i][0]) === String(c.matId)) {
          var cur = +matData[i][3] || 0
          // Захист від змішування ID та кількості
          if (fromStock > 1000000) {
            console.warn('Suspicious write-off amount: ' + fromStock)
            break
          }
          var nv  = +(cur - fromStock).toFixed(2)
          matSh.getRange(i + 1, 4).setValue(nv)
          matData[i][3] = nv
          break
        }
      }
    })

    var workerId = entry.workerId || null
    entry.consumed.forEach(function(c) {
      var fromPersonal = num(c.fromPersonal || c.fromPrep || 0)
      var fromTeam = num(c.fromTeam || 0)
      if (fromPersonal > 0) {
        if (workerId) deductPrepByWorkerId(ss, workerId, entry.typeId, c.matId, fromPersonal)
        else deductPrep(ss, entry.workerName, entry.typeId, c.matId, fromPersonal)
      }
      if (fromTeam > 0) {
        deductPrepByWorkerId(ss, 'TEAM_SHARED', entry.typeId, c.matId, fromTeam)
      }
    })

    ss.getSheetByName(SHEET.LOG).appendRow([
      entry.id, entry.datetime, entry.date,
      entry.typeId, entry.typeName, entry.workerName,
      entry.count,
      (entry.serials || []).join('|'),
      JSON.stringify(entry.consumed),
      entry.kind || 'production',
      entry.repairNote || '',
    ])

    logAction(entry.workerName || 'Невідомо', entry.kind || 'production', 'Списано ' + (entry.count||0) + ' акум.: ' + (entry.typeName||''))

    return { ok: true }
  })
}

function deductPrep(ss, workerName, typeId, matId, needed) {
  var sh   = ss.getSheetByName(SHEET.PREP)
  var data = sh.getDataRange().getValues()
  var rem  = needed
  for (var i = 1; i < data.length && rem > 0; i++) {
    if (
      data[i][2]  === workerName &&
      (data[i][3]  === typeId || data[i][3] === 'ALL') &&
      String(data[i][4]) === String(matId) &&
      data[i][11] !== 'returned'
    ) {
      var scope = data[i][12] || 'self'
      if (scope === 'all') {
        // дозволено
      }
      var qty   = +data[i][7] || 0
      var ret   = +data[i][8] || 0
      var avail = +(qty - ret).toFixed(2)
      if (avail <= 0) continue
      var use    = Math.min(avail, rem)
      var newRet = +(ret + use).toFixed(2)
      sh.getRange(i + 1, 9).setValue(newRet)
      sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')
      rem = +(rem - use).toFixed(2)
    }
  }
  if (rem > 0) { console.warn('deductPrep incomplete: ' + matId + ' needs ' + rem); }
}

function deductPrepByWorkerId(ss, workerId, typeId, matId, needed) {
  var sh   = ss.getSheetByName(SHEET.PREP)
  var data = sh.getDataRange().getValues()
  var rem  = needed
  for (var i = 1; i < data.length && rem > 0; i++) {
    if (
      (data[i][3]  === typeId || data[i][3] === 'ALL') &&
      String(data[i][4]) === String(matId) &&
      data[i][11] !== 'returned'
    ) {
      var scope = data[i][12] || 'self'
      if (scope !== 'all' && String(data[i][1]) !== String(workerId)) continue
      var qty   = +data[i][7] || 0
      var ret   = +data[i][8] || 0
      var avail = +(qty - ret).toFixed(2)
      if (avail <= 0) continue
      var use    = Math.min(avail, rem)
      var newRet = +(ret + use).toFixed(2)
      sh.getRange(i + 1, 9).setValue(newRet)
      sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')
      rem = +(rem - use).toFixed(2)
    }
  }
  if (rem > 0) { console.warn('deductPrepByWorkerId incomplete: ' + matId + ' needs ' + rem); }
}

// ══════════════════════════════════════════════════════════════
//  ЗАГОТОВКА
// ══════════════════════════════════════════════════════════════
function addPrepItem(item) {
  return withLock(function() {
    var ss      = SpreadsheetApp.getActiveSpreadsheet()
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var matData = matSh.getDataRange().getValues()
    var prepSh  = ss.getSheetByName(SHEET.PREP)
    ensureColumn(prepSh, 'scope')

    for (var i = 1; i < matData.length; i++) {
      if (String(matData[i][0]) === String(item.matId)) {
        var cur = +matData[i][3] || 0
        if (cur < item.qty) return { ok: false, error: 'Не вистачає матеріалу на складі' }
        matSh.getRange(i + 1, 4).setValue(+(cur - item.qty).toFixed(2))
        break
      }
    }

    prepSh.appendRow([
      item.id, item.workerId, item.workerName,
      item.typeId, item.matId, item.matName,
      item.unit, item.qty, 0,
      item.date, item.datetime, 'active', item.scope || 'self',
    ])

    ss.getSheetByName(SHEET.LOG).appendRow([
      item.id + 'P', item.datetime, item.date,
      item.typeId, '', item.workerName,
      0, '',
      JSON.stringify([{ name: item.matName, unit: item.unit, amount: item.qty }]),
      'prep', '',
    ])

    return { ok: true }
  })
}

function addPrepItemsBatch(items) {
  return withLock(function() {
    if (!items || !items.length) return { ok: false, error: 'Немає даних' }
    var ss      = SpreadsheetApp.getActiveSpreadsheet()
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var matData = matSh.getDataRange().getValues()
    var prepSh  = ss.getSheetByName(SHEET.PREP)
    ensureColumn(prepSh, 'scope')

    // Перевірка залишків
    for (var i = 0; i < items.length; i++) {
      var it = items[i]
      var ok = false
      for (var r = 1; r < matData.length; r++) {
        if (String(matData[r][0]) === String(it.matId)) {
          ok = true
          var cur = +matData[r][3] || 0
          if (cur < it.qty) return { ok: false, error: 'Не вистачає матеріалу на складі: ' + it.matName }
          break
        }
      }
      if (!ok) return { ok: false, error: 'Матеріал не знайдено: ' + it.matId }
    }

    // Списуємо зі складу і додаємо у заготовки
    items.forEach(function(it) {
      for (var r = 1; r < matData.length; r++) {
        if (String(matData[r][0]) === String(it.matId)) {
          var cur = +matData[r][3] || 0
          var nv = +(cur - it.qty).toFixed(2)
          matSh.getRange(r + 1, 4).setValue(nv)
          matData[r][3] = nv
          break
        }
      }
      prepSh.appendRow([
        it.id, it.workerId, it.workerName,
        it.typeId, it.matId, it.matName,
        it.unit, it.qty, 0,
        it.date, it.datetime, 'active', it.scope || 'self',
      ])
      ss.getSheetByName(SHEET.LOG).appendRow([
        it.id + 'P', it.datetime, it.date,
        it.typeId, '', it.workerName,
        0, '',
        JSON.stringify([{ name: it.matName, unit: it.unit, amount: it.qty }]),
        'prep', '',
      ])
    })

    return { ok: true }
  })
}

// Зберігає заготовки без перевірки/списання складу (компоненти вже списані вручну)
function addPrepItemsDirect(items) {
  return withLock(function() {
    if (!items || !items.length) return { ok: false, error: 'Немає даних' }
    var ss     = SpreadsheetApp.getActiveSpreadsheet()
    var prepSh = ss.getSheetByName(SHEET.PREP)
    ensureColumn(prepSh, 'scope')
    items.forEach(function(it) {
      prepSh.appendRow([
        it.id, it.workerId, it.workerName,
        it.typeId, it.matId, it.matName,
        it.unit, it.qty, 0,
        it.date, it.datetime, 'active', it.scope || 'self',
      ])
    })
    return { ok: true }
  })
}

function returnPrep(prepId, returnQty) {
  return withLock(function() {
    var ss   = SpreadsheetApp.getActiveSpreadsheet()
    var sh   = ss.getSheetByName(SHEET.PREP)
    var data = sh.getDataRange().getValues()

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) !== String(prepId)) continue
      var qty   = +data[i][7] || 0
      var ret   = +data[i][8] || 0
      var avail = +(qty - ret).toFixed(2)
      if (returnQty > avail + 0.0001) return { ok: false, error: 'Більше ніж є на руках' }

      var newRet = +(ret + returnQty).toFixed(2)
      sh.getRange(i + 1, 9).setValue(newRet)
      sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')

      var matId   = String(data[i][4])
      var matSh   = ss.getSheetByName(SHEET.MATERIALS)
      var matData = matSh.getDataRange().getValues()
      for (var j = 1; j < matData.length; j++) {
        if (String(matData[j][0]) === matId) {
          matSh.getRange(j + 1, 4).setValue(+(+matData[j][3] + returnQty).toFixed(2))
          break
        }
      }
      return { ok: true }
    }
    return { ok: false, error: 'Запис не знайдено' }
  })
}

function updatePrepField(prepId, field, value) {
  return withLock(function() {
    var ss   = SpreadsheetApp.getActiveSpreadsheet()
    var sh   = ss.getSheetByName(SHEET.PREP)
    if (!sh) return { ok: false, error: 'Таблиця PrepItems не знайдена' }
    ensureColumn(sh, 'scope')
    var data = sh.getDataRange().getValues()
    var headers = data[0]
    var col = headers.indexOf(field)
    if (col < 0) return { ok:false, error:'Невідоме поле: '+field }
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(prepId)) {
        sh.getRange(i + 1, col + 1).setValue(value)
        return { ok: true }
      }
    }
    return { ok: false, error: 'Запис не знайдено' }
  })
}

// ══════════════════════════════════════════════════════════════
//  РЕМОНТ АКУМУЛЯТОРІВ
// ══════════════════════════════════════════════════════════════
function addRepair(entry) {
  return withLock(function() {
    var ss      = SpreadsheetApp.getActiveSpreadsheet()
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var matData = matSh.getDataRange().getValues()
    var prepSh  = ss.getSheetByName(SHEET.PREP)
    if (!prepSh) prepSh = ss.insertSheet(SHEET.PREP)
    var prepData = prepSh.getDataRange().getValues()
    
    var consumedLog = []

    if (entry.consumed) {
      // Advanced flow: using explicitly calculated consumption with preps
      entry.consumed.forEach(function(c) {
        if (c.fromStock > 0) {
          for (var i = 1; i < matData.length; i++) {
            if (String(matData[i][0]) === String(c.matId)) {
              var cur = +matData[i][3] || 0
              var nv  = Math.max(0, +(cur - c.fromStock).toFixed(2))
              matSh.getRange(i + 1, 4).setValue(nv)
              matData[i][3] = nv
              break
            }
          }
        }
        
        if (c.fromPersonal > 0 || c.fromTeam > 0) {
          var personalNeed = c.fromPersonal || 0
          var teamNeed = c.fromTeam || 0
          for (var p = 1; p < prepData.length; p++) {
            var rowWorkerId = String(prepData[p][1])
            var rowMatId = String(prepData[p][4])
            var rowScope = String(prepData[p][12] || 'self')
            var rowStatus = String(prepData[p][11])
            var rowQty = num(prepData[p][7])
            var rowRetQty = num(prepData[p][8])

            if (rowStatus !== 'returned' && rowMatId === String(c.matId)) {
              var avail = +(rowQty - rowRetQty).toFixed(2)
              if (avail <= 0) continue

              if (personalNeed > 0 && rowWorkerId === String(entry.workerId) && rowScope !== 'all') {
                var use = Math.min(avail, personalNeed)
                var newRetQty = +(rowRetQty + use).toFixed(2)
                prepSh.getRange(p+1, 9).setValue(newRetQty)
                var newStatus = newRetQty >= rowQty ? 'returned' : 'partial'
                prepSh.getRange(p+1, 12).setValue(newStatus)
                prepData[p][8] = newRetQty; prepData[p][11] = newStatus
                personalNeed = +(personalNeed - use).toFixed(2)
                avail = +(avail - use).toFixed(2)
              }

              if (teamNeed > 0 && rowScope === 'all') {
                var use = Math.min(avail, teamNeed)
                var newRetQty = +(rowRetQty + use).toFixed(2)
                prepSh.getRange(p+1, 9).setValue(newRetQty)
                var newStatus = newRetQty >= rowQty ? 'returned' : 'partial'
                prepSh.getRange(p+1, 12).setValue(newStatus)
                prepData[p][8] = newRetQty; prepData[p][11] = newStatus
                teamNeed = +(teamNeed - use).toFixed(2)
              }
            }
          }
        }
        consumedLog.push({ matId: c.matId, name: c.name, unit: c.unit, amount: c.amount })
      })
    } else {
      // Legacy flow
      ;(entry.materials || []).forEach(function(m) {
        if (!m.selected || !m.qty) return
        for (var i = 1; i < matData.length; i++) {
          if (String(matData[i][0]) === String(m.matId)) {
            var cur = +matData[i][3] || 0
            var nv  = Math.max(0, +(cur - m.qty).toFixed(2))
            matSh.getRange(i + 1, 4).setValue(nv)
            matData[i][3] = nv
            consumedLog.push({ matId: m.matId, name: m.matName, unit: m.unit, amount: m.qty })
            break
          }
        }
      })
    }

    ss.getSheetByName(SHEET.REPAIR).appendRow([
      entry.id, entry.datetime, entry.date,
      entry.serial, entry.typeName, entry.typeId,
      entry.originalWorker, entry.repairWorker || '',
      entry.note || '',
      JSON.stringify(entry.materials || []),
      entry.status || 'completed',
      entry.photoUrl || '',
    ])

    ss.getSheetByName(SHEET.LOG).appendRow([
      entry.id + 'L', entry.datetime, entry.date,
      entry.typeId, entry.typeName, entry.repairWorker,
      0, entry.serial,
      JSON.stringify(consumedLog),
      'repair', entry.note || '',
    ])

    logAction(entry.originalWorker || 'Невідомо', 'repair', 'Прийнято в ремонт: ' + entry.serial)

    return { ok: true }
  })
}

function returnRepairMaterials(repairId, matIds) {
  return withLock(function() {
    var ss   = SpreadsheetApp.getActiveSpreadsheet()
    var sh   = ss.getSheetByName(SHEET.REPAIR)
    var data = sh.getDataRange().getValues()

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) !== String(repairId)) continue
      var mats    = json(data[i][9], [])
      var matSh   = ss.getSheetByName(SHEET.MATERIALS)
      var matData = matSh.getDataRange().getValues()
      mats.forEach(function(m) {
        if (!m.selected || !m.qty) return
        if (matIds && matIds.indexOf(m.matId) < 0) return
        for (var j = 1; j < matData.length; j++) {
          if (String(matData[j][0]) === String(m.matId)) {
            matSh.getRange(j + 1, 4).setValue(+(+matData[j][3] + m.qty).toFixed(2))
            break
          }
        }
      })
      return { ok: true }
    }
    return { ok: false, error: 'Запис ремонту не знайдено' }
  })
}

function deleteRepair(repairId) {
  return deleteRowWhere(SHEET.REPAIR, function(r) {
    return String(r[0]) === String(repairId)
  })
}

// ══════════════════════════════════════════════════════════════
//  ТИПИ АКУМУЛЯТОРІВ
// ══════════════════════════════════════════════════════════════
function addBatteryType(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.BATTERY)
  var id = 'bt_' + Date.now()
  sh.appendRow([id, name, '#f97316', ''])
  return { ok: true, id: id }
}

function updateBatteryTypeField(typeId, field, value) {
  var colMap = { name: 2, color: 3, manual: 4 }
  var col = colMap[field]
  if (!col) return { ok: false, error: 'Невідоме поле: ' + field }

  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.BATTERY)
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === typeId) {
      sh.getRange(i + 1, col).setValue(value)
      return { ok: true }
    }
  }
  return { ok: false, error: 'Тип не знайдено' }
}

// ══════════════════════════════════════════════════════════════
//  РЕМОНТ ІНСТРУМЕНТІВ
// ══════════════════════════════════════════════════════════════
function reportToolRepair(toolId, repairNote, repairDate, workerName) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.TOOLS)
  var data = sh.getDataRange().getValues()
  var headers = data[0]

  var rnCol = headers.indexOf('repairNote') + 1
  var rdCol = headers.indexOf('repairDate') + 1
  if (rnCol === 0) { rnCol = headers.length + 1; sh.getRange(1, rnCol).setValue('repairNote') }
  if (rdCol === 0) { rdCol = rnCol + 1;           sh.getRange(1, rdCol).setValue('repairDate') }

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] !== toolId) continue
    var toolName = data[i][1]
    var total    = int(data[i][3])
    var working  = int(data[i][4])
    var broken   = total - working

    sh.getRange(i + 1, rnCol).setValue(repairNote || '')
    sh.getRange(i + 1, rdCol).setValue(repairDate || '')

    var msg = '🔧 <b>ZmiyCell — Інструмент на ремонті</b>\n\n'
      + '🛠 <b>' + toolName + '</b>\n'
      + (broken > 0 ? '⚠ Несправних: <b>' + broken + '</b> шт\n' : '')
      + '📝 ' + (repairNote || 'Без опису') + '\n'
      + '📅 ' + (repairDate || '') + '\n'
      + (workerName ? '👷 Повідомив: ' + workerName : '')

    tgSend(msg)
    return { ok: true, toolName: toolName }
  }
  return { ok: false, error: 'Інструмент не знайдено' }
}

// ══════════════════════════════════════════════════════════════
//  ПРАЦІВНИКИ
// ══════════════════════════════════════════════════════════════
function saveWorker(worker) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ensureSheet(ss, SHEET.WORKERS, ['id', 'name', 'color'], [])
  var colIdx = ensureColumn(sh, 'color')
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === worker.id) {
      sh.getRange(i + 1, 2).setValue(worker.name)
      if (worker.color !== undefined) sh.getRange(i + 1, colIdx).setValue(worker.color)
      return { ok: true }
    }
  }
  
  var row = []
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  for (var k=0; k<headers.length; k++) row.push('')
  row[0] = worker.id
  row[1] = worker.name
  row[colIdx-1] = worker.color || ''
  sh.appendRow(row)
  
  return { ok: true }
}

function deleteWorker(id) {
  return deleteRowWhere(SHEET.WORKERS, function(r) { return r[0] === id })
}

// ══════════════════════════════════════════════════════════════
//  ОПЛАТИ
// ══════════════════════════════════════════════════════════════
function addPayment(entry) {
  return withLock(function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
    var sh = ss.getSheetByName(SHEET.PAYMENTS)
    if (!sh) {
      sh = ss.insertSheet(SHEET.PAYMENTS)
      sh.getRange(1,1,1,6).setValues([['id','workerId','workerName','count','date','datetime']])
    }
    sh.appendRow([
      entry.id, entry.workerId, entry.workerName,
      int(entry.count), entry.date, entry.datetime
    ])
    return { ok: true }
  })
}

// ══════════════════════════════════════════════════════════════
//  ІНСТРУМЕНТИ
// ══════════════════════════════════════════════════════════════
function saveTool(tool) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ensureSheet(ss, SHEET.TOOLS, ['id', 'name', 'category', 'count', 'working', 'serial', 'notes', 'repairNote', 'repairDate'], [])
  var data = sh.getDataRange().getValues()
  var row  = [
    tool.id, tool.name, tool.category,
    tool.count, tool.working,
    tool.serial     || '',
    tool.notes      || '',
    tool.repairNote || '',
    tool.repairDate || '',
  ]
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === tool.id) {
      sh.getRange(i + 1, 1, 1, row.length).setValues([row])
      return { ok: true }
    }
  }
  sh.appendRow(row)
  return { ok: true }
}

function deleteTool(id) {
  return deleteRowWhere(SHEET.TOOLS, function(r) { return r[0] === id })
}

// ══════════════════════════════════════════════════════════════
//  УТИЛІТИ
// ══════════════════════════════════════════════════════════════
function rows(ss, name) {
  var sh = ss.getSheetByName(name)
  if (!sh || sh.getLastRow() < 2) return []
  var data    = sh.getDataRange().getValues()
  var headers = data[0]
  var result  = []
  for (var i = 1; i < data.length; i++) {
    var obj = {}
    var hasValue = false
    for (var j = 0; j < headers.length; j++) {
      var v   = data[i][j]
      var str = (v !== undefined && v !== null) ? String(v) : ''
      obj[headers[j]] = str
      if (str) hasValue = true
    }
    if (hasValue) result.push(obj)
  }
  return result
}

function deleteRowWhere(sheetName, predicate) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(sheetName)
  if (!sh) return { ok: true }
  var data = sh.getDataRange().getValues()
  // Ітеруємо з кінця — так індекси не зсуваються при видаленні
  for (var i = data.length - 1; i >= 1; i--) {
    if (predicate(data[i])) {
      sh.deleteRow(i + 1)
      return { ok: true }
    }
  }
  return { ok: false, error: 'Рядок не знайдено' }
}

function findMaterialIdByName(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.MATERIALS)
  if (!sh) return null
  var data = sh.getDataRange().getValues()
  var target = String(name || '').trim().toLowerCase()
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1] || '').trim().toLowerCase() === target) return String(data[i][0])
  }
  return null
}

function isBatteryTypeId(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.BATTERY)
  if (!sh) return false
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return true
  }
  return false
}

function num(v)       { return parseFloat(v) || 0 }
function int(v)       { return parseInt(v)   || 0 }
function json(s, def) { try { return s ? JSON.parse(s) : def } catch(_) { return def } }

// ── Стандартні матеріали (нова схема) ────────────────────────
function buildDefaultMaterials() {
  var defs = [
    ['Комірки акумулятора',          'шт',  500],
    ['BMS плата',                    'шт',   20],
    ['Нікелева стрічка',             'м',    80],
    ['Корпус (кейс)',                'шт',   15],
    ['Роз\'єм XT90',                 'шт',   60],
    ['Термоусадка',                  'м',    40],
    ['Ізоляційна стрічка',          'м',   120],
    ['Балансувальні дроти',          'шт',   18],
    ['Провід 10AWG червоний',        'м',    25],
    ['Провід 10AWG чорний',          'м',    25],
    ['Роз\'єм JST балансувальний',   'шт',   30],
    ['Паяльний флюс',                'мл',  200],
    ['Припій ПОС-60',                'г',   300],
    ['Ізолятор торцевий',            'шт',  100],
    ['Плата захисту від перезаряду', 'шт',   12],
    ['Термістор NTC',                'шт',   22],
    ['Стяжка кабельна',              'шт',  500],
    ['Двосторонній скотч',           'м',    15],
    ['Клей епоксидний',              'г',   150],
    ['Гвинти M3x6',                  'шт',  400],
    ['Гайка M3',                     'шт',  400],
    ['Шайба M3',                     'шт',  600],
    ['Пінопластова прокладка',       'шт',   40],
    ['Силіконовий герметик',         'г',   200],
    ['Індикатор заряду LED',         'шт',   18],
    ['Резистор 100 Ом',              'шт',   80],
    ['Конденсатор 100мкФ',           'шт',   35],
    ['Виводи нікелеві U-подібні',    'шт',  200],
    ['Малярська стрічка',            'м',    30],
    ['Папір наждачний P400',         'шт',   20],
    ['Мастило контактне',            'мл',  100],
    ['Стікер маркування QR',         'шт',  150],
    ['Пакувальна плівка стрейч',     'м',    40],
    ['Карта контролю якості',        'шт',  100],
    ['Поліетиленовий пакет',         'шт',   80],
  ]
  return defs.map(function(d, i) {
    return ['mat_' + (i + 1), d[0], d[1], d[2], '', false, '', 0]
  })
}

// ══════════════════════════════════════════════════════════════
//  ЗБІРКИ (НАПІВФАБРИКАТИ)
//  Assemblies:        id, name, outputMatId, outputQty, unit, notes
//  AssemblyComponents: id, assemblyId, matId, qty
// ══════════════════════════════════════════════════════════════
function addAssembly(name, outputMatId, outputQty, unit, notes, manual, defDest) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.ASSEMBLIES)
  if (!sh) {
    sh = ss.insertSheet(SHEET.ASSEMBLIES)
    sh.getRange(1,1,1,8).setValues([['id','name','outputMatId','outputQty','unit','notes','manual','defDest']])
  }
  ensureColumn(sh, 'defDest')
  var id = 'asm_' + Date.now()
  sh.appendRow([id, name, outputMatId, num(outputQty), unit||'', notes||'', manual||'', defDest || 'stock'])
  return { ok:true, id:id }
}

function updateAssemblyField(asmId, field, value) {
  var colMap = { name:2, outputMatId:3, outputQty:4, unit:5, notes:6, manual:7, defDest:8 }
  var col = colMap[field]
  if (!col) return { ok:false, error:'Незавідоме поле: '+field }
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.ASSEMBLIES)
  ensureColumn(sh, 'defDest')
  var data = sh.getDataRange().getValues()
  for (var i=1; i<data.length; i++) {
    if (String(data[i][0])===String(asmId)) {
      sh.getRange(i+1, col).setValue(value)
      return { ok:true }
    }
  }
  return { ok:false, error:'Збірку не знайдено' }
}

function deleteAssembly(asmId) {
  // Видаляємо компоненти
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var acSh = ss.getSheetByName(SHEET.ASSEM_COMP)
  if (acSh) {
    var acData = acSh.getDataRange().getValues()
    for (var i=acData.length-1; i>=1; i--) {
      if (String(acData[i][1])===String(asmId)) acSh.deleteRow(i+1)
    }
  }
  return deleteRowWhere(SHEET.ASSEMBLIES, function(r) { return String(r[0])===String(asmId) })
}

function addAssemblyComponent(assemblyId, matId, qty) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var acSh = ss.getSheetByName(SHEET.ASSEM_COMP)
  if (!acSh) {
    acSh = ss.insertSheet(SHEET.ASSEM_COMP)
    acSh.getRange(1,1,1,4).setValues([['id','assemblyId','matId','qty']])
  }
  // Перевіряємо дублікат
  var data = acSh.getDataRange().getValues()
  for (var i=1; i<data.length; i++) {
    if (String(data[i][1])===String(assemblyId) && String(data[i][2])===String(matId)) {
      return { ok:false, error:'Цей матеріал вже є в збірці' }
    }
  }
  var id = 'ac_' + Date.now()
  acSh.appendRow([id, assemblyId, matId, num(qty)])
  return { ok:true, id:id }
}

function updateAssemblyComponent(acId, qty) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.ASSEM_COMP)
  var data = sh.getDataRange().getValues()
  for (var i=1; i<data.length; i++) {
    if (String(data[i][0])===String(acId)) {
      sh.getRange(i+1, 4).setValue(num(qty))
      return { ok:true }
    }
  }
  return { ok:false, error:'Компонент не знайдено' }
}

function removeAssemblyComponent(acId) {
  return deleteRowWhere(SHEET.ASSEM_COMP, function(r) { return String(r[0])===String(acId) })
}

function saveAssemblyComponents(assemblyId, componentsJson) {
  return withLock(function() {
    var ss   = SpreadsheetApp.getActiveSpreadsheet()
    var acSh = ss.getSheetByName(SHEET.ASSEM_COMP)
    if (!acSh) {
      acSh = ss.insertSheet(SHEET.ASSEM_COMP)
      acSh.getRange(1,1,1,4).setValues([['id','assemblyId','matId','qty']])
    }
    
    // 1. Delete all existing components for this assembly
    var data = acSh.getDataRange().getValues()
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]) === String(assemblyId)) {
        acSh.deleteRow(i + 1)
      }
    }
    
    // 2. Add the new components
    var comps = json(componentsJson, [])
    var added = 0
    comps.forEach(function(c) {
      if (!c.matId || !(num(c.qty) > 0)) return
      var id = 'ac_' + Date.now() + '_' + added++
      acSh.appendRow([id, assemblyId, c.matId, num(c.qty)])
    })

    return { ok: true }
  })
}

// Виготовлення збірки: списує компоненти, додає готові на склад
// entry: { assemblyId, qty, workerId, workerName, date, datetime }
function produceAssembly(entry) {
  return withLock(function() {
    var ss      = SpreadsheetApp.getActiveSpreadsheet()
    var asmSh   = ss.getSheetByName(SHEET.ASSEMBLIES)
    var acSh    = ss.getSheetByName(SHEET.ASSEM_COMP)
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var asmData = asmSh.getDataRange().getValues()
    var acData  = acSh.getDataRange().getValues()
    var matData = matSh.getDataRange().getValues()

    // Знайти збірку
    var asm = null
    for (var i=1; i<asmData.length; i++) {
      if (String(asmData[i][0])===String(entry.assemblyId)) {
        asm = { id:asmData[i][0], name:asmData[i][1], outputMatId:asmData[i][2], outputQty:num(asmData[i][3]) }
        break
      }
    }
    if (!asm) return { ok:false, error:'Збірку не знайдено' }

    // Компоненти збірки
    var components = []
    for (var j=1; j<acData.length; j++) {
      if (String(acData[j][1])===String(entry.assemblyId)) {
        components.push({ matId:String(acData[j][2]), qty:num(acData[j][3]) })
      }
    }

    // Перевіряємо наявність компонентів
    var totalQty = num(entry.qty)
    var consumed = []
    for (var k=0; k<components.length; k++) {
      var comp    = components[k]
      var need    = +(comp.qty * totalQty).toFixed(2)
      var matName = ''
      var matUnit = ''
      var hasStock = false
      for (var m=1; m<matData.length; m++) {
        if (String(matData[m][0])===String(comp.matId)) {
          var avail = num(matData[m][3])
          matName = String(matData[m][1])
          matUnit = String(matData[m][2])
          if (avail < need - 0.0001) {
            return { ok:false, error:'Не вистачає: '+matName+' (потрібно '+need+', є '+avail+')' }
          }
          hasStock = true
          break
        }
      }
      if (!hasStock) return { ok:false, error:'Матеріал не знайдено: '+comp.matId }
      consumed.push({ matId:comp.matId, name:matName, unit:matUnit, amount:need })
    }

    // Списуємо компоненти
    consumed.forEach(function(c) {
      for (var m=1; m<matData.length; m++) {
        if (String(matData[m][0])===String(c.matId)) {
          var nv = Math.max(0, +(num(matData[m][3]) - c.amount).toFixed(2))
          matSh.getRange(m+1, 4).setValue(nv)
          matData[m][3] = nv
          break
        }
      }
    })

    // Додаємо готові збірки на склад (outputQty * qty штук)
    var outputAmt = +(asm.outputQty * totalQty).toFixed(2)
    for (var m=1; m<matData.length; m++) {
      if (String(matData[m][0])===String(asm.outputMatId)) {
        var newStock = +(num(matData[m][3]) + outputAmt).toFixed(2)
        matSh.getRange(m+1, 4).setValue(newStock)
        matData[m][3] = newStock
        break
      }
    }

    // Логуємо в Log
    var logId = 'asmL_' + entry.assemblyId + '_' + Date.now()
    ss.getSheetByName(SHEET.LOG).appendRow([
      logId, entry.datetime, entry.date,
      '', asm.name, entry.workerName,
      totalQty, '',
      JSON.stringify(consumed),
      'assembly', '',
    ])

    return { ok:true, outputAmt:outputAmt, consumed:consumed }
  })
}

// Виготовлення збірки з розширеною логікою (використання заготовок)
// entry: { assemblyId, qty, workerId, workerName, date, datetime, destination, consumed, outputAmt }
function produceAssemblyAdvanced(entry) {
  return withLock(function() {
    var ss      = SpreadsheetApp.getActiveSpreadsheet()
    var asmSh   = ss.getSheetByName(SHEET.ASSEMBLIES)
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var prepSh  = ss.getSheetByName(SHEET.PREP)
    if (!prepSh) prepSh = ss.insertSheet(SHEET.PREP)
      
    var matData = matSh.getDataRange().getValues()
    var prepData = prepSh.getDataRange().getValues()
    var asmData = asmSh.getDataRange().getValues()
    
    // Знаходимо збірку
    var asm = null
    for (var i=1; i<asmData.length; i++) {
       if (String(asmData[i][0]) === String(entry.assemblyId)) {
          asm = { id:asmData[i][0], name:asmData[i][1], outputMatId:asmData[i][2], unit:String(asmData[i][5]||'') } // unit in Col 5
          break
       }
    }
    if(!asm) return {ok:false, error:'Збірку не знайдено'}

    var consumedList = decompressConsumed(entry.consumed, matData)

    // 1. Списуємо матеріали з глобального складу
    consumedList.forEach(function(c) {
      if (c.fromStock > 0) {
        for (var m=1; m<matData.length; m++) {
          if (String(matData[m][0]) === String(c.matId)) {
            var nv = Math.max(0, +(num(matData[m][3]) - c.fromStock).toFixed(2))
            matSh.getRange(m+1, 4).setValue(nv)
            matData[m][3] = nv
            break
          }
        }
      }
    })

    // 2. Зменшуємо (списання) заготовки на руках (prepItems)
    consumedList.forEach(function(c) {
      if (c.fromPersonal > 0 || c.fromTeam > 0) {
        var personalNeed = c.fromPersonal
        var teamNeed = c.fromTeam

        for (var p=1; p<prepData.length; p++) {
           var rowWorkerId = String(prepData[p][1])
           var rowMatId = String(prepData[p][4])
           var rowScope = String(prepData[p][12] || 'self')
           var rowStatus = String(prepData[p][11])
           var rowQty = num(prepData[p][7])
           var rowRetQty = num(prepData[p][8])

           if (rowStatus !== 'returned' && rowMatId === String(c.matId)) {
              var avail = +(rowQty - rowRetQty).toFixed(2)
              if (avail <= 0) continue

              if (personalNeed > 0 && rowWorkerId === String(entry.workerId) && rowScope !== 'all') {
                  var use = Math.min(avail, personalNeed)
                  var newRetQty = +(rowRetQty + use).toFixed(2)
                  prepSh.getRange(p+1, 9).setValue(newRetQty)
                  var newStatus = newRetQty >= rowQty ? 'returned' : 'partial'
                  prepSh.getRange(p+1, 12).setValue(newStatus)
                  
                  prepData[p][8] = newRetQty
                  prepData[p][11] = newStatus
                  personalNeed = +(personalNeed - use).toFixed(2)
                  avail = +(avail - use).toFixed(2) // if needed for teamNeed fallback, though it's distinct scope
              }

              if (teamNeed > 0 && rowScope === 'all') {
                  var use = Math.min(avail, teamNeed)
                  var newRetQty = +(rowRetQty + use).toFixed(2)
                  prepSh.getRange(p+1, 9).setValue(newRetQty)
                  var newStatus = newRetQty >= rowQty ? 'returned' : 'partial'
                  prepSh.getRange(p+1, 12).setValue(newStatus)
                  
                  prepData[p][8] = newRetQty
                  prepData[p][11] = newStatus
                  teamNeed = +(teamNeed - use).toFixed(2)
              }
           }
        }
      }
    })

    // 3. Зберігаємо результат
    var outputAmt = num(entry.outputAmt) || 1
    
    if (entry.destination === 'stock') {
      // На глобальний склад
      for (var m=1; m<matData.length; m++) {
        if (String(matData[m][0]) === String(asm.outputMatId)) {
          var newStock = +(num(matData[m][3]) + outputAmt).toFixed(2)
          matSh.getRange(m+1, 4).setValue(newStock)
          matData[m][3] = newStock
          break
        }
      }
    } else {
      // Як нова заготовка
      var scope = entry.destination === 'team' ? 'all' : 'self'
      var pId = 'prep_' + Date.now()
      var gmName = asm.outputMatId
      var gmUnit = asm.unit
      for (var m=1; m<matData.length; m++) {
        if (String(matData[m][0]) === String(asm.outputMatId)) {
          gmName = String(matData[m][1])
          gmUnit = String(matData[m][2])
          break
        }
      }
      // 'id','workerId','workerName','typeId','matId','matName','unit','qty','returnedQty','date','datetime','status','scope'
      prepSh.appendRow([
        pId, entry.workerId, entry.workerName, 'ALL', asm.outputMatId, gmName, gmUnit, outputAmt, 0, entry.date, entry.datetime, 'active', scope
      ])
    }

    // 4. Логуємо
    var logId = 'asmL_' + entry.assemblyId + '_' + Date.now()
    ss.getSheetByName(SHEET.LOG).appendRow([
      logId, entry.datetime, entry.date,
      '', asm.name + (entry.destination!=='stock' ? ' (як заготовка)' : ''), entry.workerName,
      entry.qty, '',
      JSON.stringify(consumedList),
      'assembly', '',
    ])

    logAction(entry.workerName || 'Невідомо', 'assembly', 'Виготовлено збірку: ' + asm.name + ' (' + entry.qty + ' шт)')

    return { ok: true }
  })
}

function logToolEvent(toolId, toolName, date, datetime, event, workerName, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ensureSheet(ss, SHEET.TOOL_LOG, ['id','toolId','toolName','date','datetime','event','workerName','note'], [])
  sh.appendRow(['tl_'+Date.now(), toolId, toolName, date, datetime, event, workerName, note])
  return { ok: true }
}

function issueConsumable(workerId, workerName, matId, matName, qty, unit, date, datetime) {
  return withLock(function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
    var logSh = ensureSheet(ss, SHEET.LOG, ['id','datetime','date','typeId','typeName','workerName','count','serials','consumedJson','kind','repairNote'], [])
    
    // Списуємо матеріал
    var res = updateMaterialStock(matId, -num(qty))
    if (!res.ok) return res
    
    // Записуємо в основний лог
    var consumed = [{ matId: matId, name: matName, unit: unit, amount: num(qty) }]
    logSh.appendRow(['log_'+Date.now(), datetime, date, 'ALL', 'Розхідні матеріали', workerName, 0, '', JSON.stringify(consumed), 'consumable', ''])
    
    return { ok: true }
  })
}

function updateRepairStatus(repairId, status, dateCompleted, workerName, materialsJson, noteAppend, photoUrl) {
  return withLock(function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
    var repSh = ss.getSheetByName(SHEET.REPAIR)
    if (!repSh) return { ok: false, error: 'Sheet not found' }
    var data = repSh.getDataRange().getValues()
    var foundIndex = -1
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(repairId)) {
        foundIndex = i
        break
      }
    }
    if (foundIndex < 0) return { ok: false, error: 'Repair not found' }
    
    var row = data[foundIndex]
    
    // Update photo if provided
    if (photoUrl) {
      repSh.getRange(foundIndex + 1, 12).setValue(photoUrl)
    }
    
    // Deduct materials if completing
    var consumed = []
    if (status === 'completed' && materialsJson) {
      var matSh = ss.getSheetByName(SHEET.MATERIALS)
      var matData = matSh.getDataRange().getValues()
      // Використовуємо decompressConsumed (підтримує формат fromStock:fromPersonal:fromTeam)
      var mats = decompressConsumed(materialsJson, matData)
      mats.forEach(function(m) {
        // Списуємо ТІЛЬКИ fromStock — матеріали з заготовок вже були списані при прийомці
        var fromStock = num(m.fromStock || 0)
        if (fromStock <= 0) return
        for (var j = 1; j < matData.length; j++) {
          if (String(matData[j][0]) === String(m.matId)) {
            var cur = +matData[j][3] || 0
            var nv  = Math.max(0, +(cur - fromStock).toFixed(2))
            matSh.getRange(j + 1, 4).setValue(nv)
            matData[j][3] = nv
            consumed.push({ matId: m.matId, name: m.name, unit: m.unit, amount: fromStock })
            break
          }
        }
      })
      // Зберігаємо consumed у запис ремонту
      repSh.getRange(foundIndex + 1, 10).setValue(JSON.stringify(mats))
      
      // Оновлюємо ремонтника якщо передано
      if (workerName) {
        repSh.getRange(foundIndex + 1, 8).setValue(workerName)
      }
      
      // Логуємо списання
      var logSh = ss.getSheetByName(SHEET.LOG)
      if (consumed.length > 0) {
        var datetime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm")
        logSh.appendRow([
          repairId + '_C', datetime, dateCompleted,
          row[5], row[4], workerName || row[7],
          0, row[3],
          JSON.stringify(consumed),
          'repair', 'Завершено ремонт: ' + row[3]
        ])
      }
    }

    repSh.getRange(foundIndex + 1, 11).setValue(status) // 11th col is status
    
    var curNote = String(row[8] || '')
    var fullAppend = ""
    if (noteAppend) fullAppend += noteAppend
    if (dateCompleted) fullAppend += (fullAppend ? ' | ':'') + 'Завершено: ' + dateCompleted
    if (fullAppend) {
       var newNote = curNote + (curNote ? ' | ' : '') + fullAppend
       repSh.getRange(foundIndex + 1, 9).setValue(newNote) // Note is col 9
    }
    
    if (status === 'completed') {
      logAction(workerName || 'Невідомо', 'repair', 'Завершено ремонт: ' + String(row[3]))
    }

    return { ok: true, consumed: consumed }
  })
}

// num / int / json вже оголошені вище (рядки ~1339)

function decompressConsumed(val, matData) {
  if (!val) return []
  if (typeof val !== 'string') return val
  if (val.charAt(0) === '[') return json(val, [])
  var list = val.split('|').filter(Boolean).map(function(s) {
    var p = s.split(':')
    return { matId: p[0], amount: num(p[1]), fromPersonal: num(p[2]), fromTeam: num(p[3]), fromStock: num(p[4]) }
  })
  if (matData) {
    var mapObj = {}
    for (var i=1; i<matData.length; i++) {
      mapObj[String(matData[i][0])] = { name: String(matData[i][1]), unit: String(matData[i][2]) }
    }
    list.forEach(function(c) {
      var m = mapObj[c.matId] || { name: 'Невідомо', unit: '' }
      if (!c.name) c.name = m.name
      if (!c.unit) c.unit = m.unit
    })
  }
  return list
}

function decompressMats(val, matData) {
  if (!val) return []
  if (typeof val !== 'string') return val
  if (val.charAt(0) === '[') return json(val, [])
  var list = val.split('|').filter(Boolean).map(function(s) {
    var p = s.split(':')
    return { matId: p[0], qty: num(p[1]), selected: true }
  })
  if (matData) {
    var mapObj = {}
    for (var i=1; i<matData.length; i++) {
      mapObj[String(matData[i][0])] = { name: String(matData[i][1]), unit: String(matData[i][2]) }
    }
    list.forEach(function(c) {
      var m = mapObj[c.matId] || { name: 'Невідомо', unit: '' }
      c.matName = m.name
      c.unit = m.unit
    })
  }
  return list
}

// ══════════════════════════════════════════════════════════════
//  ЛОГ ДІЙ
// ══════════════════════════════════════════════════════════════
function logAction(user, actionType, details) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.ACTION_LOG)
  if (!sh) return { ok: false, error: 'ActionLogs sheet not found' }
  var now = new Date()
  var date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd.MM.yyyy')
  var datetime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm')
  var id = String(now.getTime())
  sh.appendRow([id, date, datetime, user || '', actionType || '', details || ''])
  return { ok: true }
}

function getActionLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.ACTION_LOG)
  if (!sh) return []
  var rows = sh.getDataRange().getValues()
  if (rows.length < 2) return []
  return rows.slice(1).map(function(r) {
    return { id: String(r[0]), date: String(r[1]), datetime: String(r[2]), user: String(r[3]), actionType: String(r[4]), details: String(r[5]) }
  }).reverse()
}

// ══════════════════════════════════════════════════════════════
//  БЕКАП / ІНВЕНТАРИЗАЦІЯ
// ══════════════════════════════════════════════════════════════
function saveStockBackup(user) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  var bakSh = ss.getSheetByName(SHEET.MAT_BACKUP)
  if (!matSh || !bakSh) return { ok: false, error: 'Sheet not found' }

  var rows = matSh.getDataRange().getValues()
  if (rows.length < 2) return { ok: false, error: 'No materials' }
  var headers = rows[0]
  var idIdx=0, nameIdx=1, unitIdx=2, stockIdx=3

  // Find columns by header name
  headers.forEach(function(h, i) {
    if (h === 'id') idIdx = i
    else if (h === 'name') nameIdx = i
    else if (h === 'unit') unitIdx = i
    else if (h === 'stock') stockIdx = i
  })

  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm')

  // Clear and rewrite backup
  bakSh.clearContents()
  bakSh.appendRow(['matId', 'name', 'unit', 'stock', 'snapshotDate'])
  rows.slice(1).forEach(function(r) {
    bakSh.appendRow([String(r[idIdx]), String(r[nameIdx]), String(r[unitIdx]), parseFloat(r[stockIdx]) || 0, today])
  })

  logAction(user || 'Адмін', 'backup', 'Зріз складу створено: ' + today)
  return { ok: true, date: today }
}

function getBackupDiff() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  var bakSh = ss.getSheetByName(SHEET.MAT_BACKUP)
  if (!matSh || !bakSh) return { ok: false, error: 'Sheet not found' }

  var matRows = matSh.getDataRange().getValues()
  var bakRows = bakSh.getDataRange().getValues()
  if (matRows.length < 2) return []
  if (bakRows.length < 2) return []

  var matHeaders = matRows[0]
  var idIdx=0, nameIdx=1, unitIdx=2, stockIdx=3
  matHeaders.forEach(function(h, i) {
    if (h === 'id') idIdx = i
    else if (h === 'name') nameIdx = i
    else if (h === 'unit') unitIdx = i
    else if (h === 'stock') stockIdx = i
  })

  // Build backup map
  var bakMap = {}
  var snapshotDate = ''
  bakRows.slice(1).forEach(function(r) {
    bakMap[String(r[0])] = { stock: parseFloat(r[3]) || 0, name: String(r[1]) }
    if (!snapshotDate && r[4]) snapshotDate = String(r[4])
  })

  var result = matRows.slice(1).map(function(r) {
    var matId = String(r[idIdx])
    var current = parseFloat(r[stockIdx]) || 0
    var bak = bakMap[matId]
    var backup = bak ? bak.stock : null
    var diff = backup !== null ? +(current - backup).toFixed(2) : null
    return { matId, name: String(r[nameIdx]), unit: String(r[unitIdx]), current, backup, diff }
  })

  return { ok: true, rows: result, snapshotDate }
}

function restoreFromBackup(user) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  var bakSh = ss.getSheetByName(SHEET.MAT_BACKUP)
  if (!matSh || !bakSh) return { ok: false, error: 'Sheet not found' }

  var bakRows = bakSh.getDataRange().getValues()
  if (bakRows.length < 2) return { ok: false, error: 'Backup is empty' }
  var bakMap = {}
  bakRows.slice(1).forEach(function(r) { bakMap[String(r[0])] = parseFloat(r[3]) || 0 })

  var matRows = matSh.getDataRange().getValues()
  var headers = matRows[0]
  var idIdx=0, stockIdx=3
  headers.forEach(function(h, i) {
    if (h === 'id') idIdx = i
    else if (h === 'stock') stockIdx = i
  })

  matRows.slice(1).forEach(function(r, i) {
    var matId = String(r[idIdx])
    if (bakMap[matId] !== undefined) {
      matSh.getRange(i + 2, stockIdx + 1).setValue(bakMap[matId])
    }
  })

  logAction(user || 'Адмін', 'restore', 'Склад відновлено з бекапу')
  return { ok: true }
}

// ══════════════════════════════════════════════════════════════
//  ЛОГ ВИДАЧІ ЗАГОТОВОК
// ══════════════════════════════════════════════════════════════
function logPrepEntry(entry) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.LOG)
  if (!sh) return { ok: false, error: 'Log sheet not found' }
  // Columns: id, datetime, date, typeId, typeName, workerName, count, serials(JSON), consumed(JSON), kind, note
  sh.appendRow([
    entry.id,
    entry.datetime,
    entry.date,
    entry.typeId || 'ALL',
    entry.typeName || '',
    entry.workerName || '',
    0,
    JSON.stringify(entry.serials || []),
    JSON.stringify(entry.consumed || []),
    'prep',
    entry.note || '',
  ])
  return { ok: true }
}


// deleteRowWhere визначена вище (~рядок 1302) — дублікат видалено

function saveRadioStation(station) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.RADIO)
  if (!sh) return { ok: false, error: 'Sheet not found' }
  
  if (!station.id) {
    station.id = 'r_' + Date.now()
    sh.appendRow([station.id, station.name, station.url])
  } else {
    var data = sh.getDataRange().getValues()
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(station.id)) {
        sh.getRange(i + 1, 1, 1, 3).setValues([[station.id, station.name, station.url]])
        return { ok: true, id: station.id }
      }
    }
  }
  return { ok: true, id: station.id }
}

function deleteRadioStation(id) {
  return deleteRowWhere(SHEET.RADIO, function(r) {
    return String(r[0]) === String(id)
  })
}

function undoAction(logId) {
  return withLock(function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
    var logSh = ss.getSheetByName(SHEET.LOG)
    var matSh = ss.getSheetByName(SHEET.MATERIALS)
    var prepSh = ss.getSheetByName(SHEET.PREP)
    var asmSh = ss.getSheetByName(SHEET.ASSEMBLIES)
    var actionLogSh = ss.getSheetByName(SHEET.ACTION_LOG)

    var logData = logSh.getDataRange().getValues()
    var targetRowIdx = -1
    var targetLog = null

    for (var i = 1; i < logData.length; i++) {
      if (String(logData[i][0]) === String(logId)) {
        targetRowIdx = i + 1
        targetLog = logData[i]
        break
      }
    }

    if (targetRowIdx === -1) return { ok: false, error: 'Запис не знайдено в журналі' }

    // ['id', 'datetime', 'date', 'typeId', 'typeName', 'workerName', 'count', 'serials', 'consumed', 'kind', 'repairNote']
    var kind = String(targetLog[9] || 'production')
    var consumedJSON = String(targetLog[8] || '[]')
    var consumed = []
    try { consumed = JSON.parse(consumedJSON) } catch(e) {}
    
    var count = Number(targetLog[6]) || 0
    var workerName = String(targetLog[5]) || ''
    var typeIdOrAsmId = String(targetLog[3]) || '' // for assembly actually id has logId as 'asmL_asmId_time'

    // We need to parse Assembly ID from logId if kind === 'assembly'
    var isAssembly = kind === 'assembly'
    var isPrep = kind === 'prep'
    var isProduction = kind === 'production'
    var isRepair = kind === 'repair'

    // Step 1: Data extraction for Assembly output (we need to deduct it back)
    if (isAssembly) {
      // logId format: asmL_{assemblyId}_{timestamp}
      var logParts = String(logId).split('_')
      // Assembly ID may contain underscores (e.g. asm_123), so we take everything between 'asmL' and 'timestamp'
      var asmId = logParts.slice(1, -1).join('_')
      
      // Determine if it was sent to stock or prep.
      // 1. Look for this assembly in assemblies to determine outputMatId
      var asms = asmSh.getDataRange().getValues()
      var outputMatId = null
      var defDest = 'stock'
      for (var a = 1; a < asms.length; a++) {
        if (String(asms[a][0]) === String(asmId)) {
          outputMatId = String(asms[a][3])
          defDest = String(asms[a][8] || 'stock')
          if (defDest === 'true' || defDest === 'false') defDest = 'stock' // legacy
          break;
        }
      }
      
      if (!outputMatId) return { ok: false, error: 'Збірку не знайдено в базі, неможливо скасувати.' }

      // Depending on targetLog[4] "typeName" which holds asmName + optional "(в заготовку)"
      var typeName = String(targetLog[4]) || ''
      var sentToPrep = typeName.indexOf('заготовку') !== -1

      if (!sentToPrep) {
        // Sent to Stock. Check if we can deduct it
        var matData = matSh.getDataRange().getValues()
        var mIdx = -1
        var st = 0
        for (var m = 1; m < matData.length; m++) {
          if (String(matData[m][0]) === outputMatId) {
            mIdx = m
            st = Number(matData[m][4]) || 0
            break
          }
        }
        if (mIdx !== -1 && st - count < 0) {
          return { ok: false, error: 'Ця збірка вже була використана (залишок на складі піде в мінус). Скасування заборонено.' }
        }
        if (mIdx !== -1) {
          matSh.getRange(mIdx+1, 5).setValue(st - count)
        }
      } else {
        // Sent to prepItems. We need to find the specific prepItem and delete it or deduct.
        // It's usually logged at exact same time with the same worker.
        var prepData = prepSh.getDataRange().getValues()
        // [id, workerId, workerName, typeId, matId, matName, unit, qty, returnedQty, ...]
        var prepIdx = -1
        for (var p = prepData.length - 1; p >= 1; p--) {
          if (String(prepData[p][4]) === outputMatId && 
              String(prepData[p][2]) === workerName &&
              Number(prepData[p][7]) === count && 
              String(prepData[p][9]) === String(targetLog[2])) { // matching date
            
            var rQty = Number(prepData[p][8]) || 0
            if (rQty > 0) return { ok: false, error: 'Заготовка з цієї збірки вже частково використана. Скасування заборонено.' }
            prepIdx = p
            break
          }
        }
        if (prepIdx === -1) {
           return { ok: false, error: 'Не знайдено відповідну заготовку для скасування.' }
        }
        prepSh.deleteRow(prepIdx + 1)
      }
    } 
    
    if (isPrep) {
      // Direct raw prep creation via Add Prep modal
      // We must delete the prep row. Log format: logId ends with 'P' -> original prepId is logId minus 'P'
      var origPrepId = String(logId).replace(/P$/, '')
      var prepData = prepSh.getDataRange().getValues()
      var foundRow = -1
      for (var p = 1; p < prepData.length; p++) {
        if (String(prepData[p][0]) === origPrepId) {
          var rQ = Number(prepData[p][8]) || 0
          if (rQ > 0) return { ok: false, error: 'Заготовка вже почала використовуватись. Скасувати неможливо.' }
          foundRow = p
          break
        }
      }
      if (foundRow !== -1) {
        prepSh.deleteRow(foundRow + 1)
      }
      // Usually prep also deducts from stock. `consumed` array holds what was consumed from stock.
    }

    // Now, restore `consumed` materials.
    // They look like [{matId, fromStock, fromPersonal, fromTeam}] OR basic format for prep [{amount}]
    if (consumed && consumed.length > 0) {
      var matData = matSh.getDataRange().getValues()
      var prepData = prepSh.getDataRange().getValues() 
      
      for (var c = 0; c < consumed.length; c++) {
        var item = consumed[c]
        var mId = item.matId
        
        if (isAssembly || isProduction || isRepair) {
           // Complex consumed structure
           var addStock = Number(item.fromStock) || Number(item.amount) || 0
           var addPers = Number(item.fromPersonal) || 0
           var addTeam = Number(item.fromTeam) || 0

           // 1. Add back to global stock
           if (addStock > 0 && mId) {
             for (var m = 1; m < matData.length; m++) {
               if (String(matData[m][0]) === String(mId)) {
                 var st = Number(matData[m][4]) || 0
                 matSh.getRange(m + 1, 5).setValue(st + addStock)
                 break
               }
             }
           }

           // 2. Add back to Prep (by DECREASING `returnedQty`)
           if (addPers > 0 && mId) {
             for (var p = prepData.length - 1; p >= 1; p--) {
               var isPers = String(prepData[p][12]) === 'self' || String(prepData[p][12]) === 'personal' || !prepData[p][12]
               if (String(prepData[p][4]) === String(mId) && String(prepData[p][2]) === workerName && isPers) {
                  var retQty = Number(prepData[p][8]) || 0
                  if (retQty > 0) {
                    var canReturnHere = Math.min(retQty, addPers)
                    retQty -= canReturnHere
                    addPers -= canReturnHere
                    prepSh.getRange(p + 1, 9).setValue(retQty)
                    prepData[p][8] = retQty
                  }
                  if (addPers <= 0) break 
               }
             }
           }
           
           if (addTeam > 0 && mId) {
             for (var p = prepData.length - 1; p >= 1; p--) {
               var isTeam = String(prepData[p][12]) === 'team' || String(prepData[p][12]) === 'all'
               if (String(prepData[p][4]) === String(mId) && isTeam) {
                  var retQty = Number(prepData[p][8]) || 0
                  if (retQty > 0) {
                    var canReturnHere = Math.min(retQty, addTeam)
                    retQty -= canReturnHere
                    addTeam -= canReturnHere
                    prepSh.getRange(p + 1, 9).setValue(retQty)
                    prepData[p][8] = retQty
                  }
                  if (addTeam <= 0) break 
               }
             }
           }
        } else if (isPrep) {
           // Simple consumed structure for raw PrepItems: [{name, unit, amount}]
           // Wait, for prep items, it doesn't store matId in the short log! 
           // BUT it deducts from MAT_ID if we know the matName? 
           // In produceBatteries: 
           // prepSh.appendRow([..., gmName])
           // Actually, the easiest way for prep is to match matName if matId is absent
           var amt = Number(item.amount) || 0
           if (amt > 0) {
             var mName = String(item.name || '')
             for (var m = 1; m < matData.length; m++) {
               if (String(matData[m][2]) === mName) { // matName is column 2 (index 2)
                 var st = Number(matData[m][4]) || 0
                 matSh.getRange(m + 1, 5).setValue(st + amt)
                 break
               }
             }
           }
        }
      }
    }

    // Finally, remove the LOG row
    logSh.deleteRow(targetRowIdx)
    
    // Append to action log
    if (actionLogSh) {
      logAction(workerName + ' / Адмін', 'undo', 'Скасування дії: ' + kind + ', logId: ' + logId)
    }

    return { ok: true }
  })
}
