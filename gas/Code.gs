
// ══════════════════════════════════════════════════════════════
//  ZmiyCell — Google Apps Script  (Code.gs)
//  Vercel + проксі (api/gas.js)
//  GET: ?action=назваФункції&params=[...]
//
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
  LOG:       'Log',
  REPAIR:    'RepairLog',
  PREP:      'PrepItems',
  PAYMENTS:  'Payments',
}

// Telegram — заповніть свої дані
var TG_TOKEN   = 'ВСТАВТЕ_TOKEN'   // @BotFather
var TG_CHAT_ID = 'ВСТАВТЕ_CHAT_ID' // @userinfobot або @getidsbot

// ── Telegram відправка ────────────────────────────────────────
function tgSend(text) {
  if (TG_TOKEN === 'ВСТАВТЕ_TOKEN') return
  try {
    UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage',
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      }
    )
  } catch(e) { Logger.log('TG error: ' + e.message) }
}

function sendTelegramAction(text) {
  tgSend(text)
  return { ok: true }
}

// ── Точка входу GET ───────────────────────────────────────────
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

// ── Таблиця дій ──────────────────────────────────────────────
var ACTIONS = {
  loadAll:                loadAll,
  initSheets:             initSheets,
  migrateToNewSchema:     migrateToNewSchema,

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
  updatePrepField:        updatePrepField,
  returnPrep:             returnPrep,
  addRepair:              addRepair,
  returnRepairMaterials:  returnRepairMaterials,
  deleteRepair:           deleteRepair,

  // Типи батарей
  addBatteryType:         addBatteryType,
  updateBatteryTypeField: updateBatteryTypeField,

  // Працівники
  saveWorker:             saveWorker,
  deleteWorker:           deleteWorker,
  addPayment:             addPayment,
  repairMaterialIds:      repairMaterialIds,

  // Інструменти
  saveTool:               saveTool,
  deleteTool:             deleteTool,
  reportToolRepair:       reportToolRepair,

  // Збірки (напівфабрикати)
  addAssembly:            addAssembly,
  updateAssemblyField:    updateAssemblyField,
  deleteAssembly:         deleteAssembly,
  addAssemblyComponent:   addAssemblyComponent,
  updateAssemblyComponent:updateAssemblyComponent,
  removeAssemblyComponent:removeAssemblyComponent,
  produceAssembly:        produceAssembly,

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
    ['id', 'name', 'outputMatId', 'outputQty', 'unit', 'notes'],
    []
  )
  ensureSheet(ss, SHEET.ASSEM_COMP,
    ['id', 'assemblyId', 'matId', 'qty'],
    []
  )

  ensureSheet(ss, SHEET.WORKERS,
    ['id', 'name'],
    [
      ['w1', 'Іваненко О.'], ['w2', 'Петренко В.'],
      ['w3', 'Сидоренко М.'], ['w4', 'Коваленко Т.'],
      ['w5', 'Бойченко Р.'], ['w6', 'Мельник Д.'],
    ]
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

  ensureSheet(ss, SHEET.LOG,
    ['id','datetime','date','typeId','typeName','workerName','count','serials','consumedJson','kind','repairNote'],
    []
  )

  ensureSheet(ss, SHEET.REPAIR,
    ['id','datetime','date','serial','typeName','typeId','originalWorker','repairWorker','note','materialsJson','status'],
    []
  )

  ensureSheet(ss, SHEET.PREP,
    ['id','workerId','workerName','typeId','matId','matName','unit','qty','returnedQty','date','datetime','status','scope'],
    []
  )
  ensureColumn(ss.getSheetByName(SHEET.PREP), 'scope')
  ensureSheet(ss, SHEET.PAYMENTS,
    ['id','workerId','workerName','count','date','datetime'],
    []
  )

  return { ok: true, message: 'Ініціалізацію завершено' }
}

// ══════════════════════════════════════════════════════════════
//  МІГРАЦІЯ зі старої схеми на нову
//  Запустити ОДИН РАЗ вручну після оновлення коду
// ══════════════════════════════════════════════════════════════
function migrateToNewSchema() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  if (!matSh) return { ok: false, error: 'Таблиця Materials не знайдена' }

  var data = matSh.getDataRange().getValues()
  var headers = data[0]

  // Перевіряємо чи стара схема (є колонка typeId)
  var typeIdCol = headers.indexOf('typeId')
  if (typeIdCol < 0) return { ok: true, message: 'Вже нова схема, міграція не потрібна' }

  // Читаємо всі старі рядки
  var oldMats = []
  for (var i = 1; i < data.length; i++) {
    var row = data[i]
    var hasVal = false
    for (var c = 0; c < row.length; c++) { if (row[c] !== '') { hasVal = true; break } }
    if (!hasVal) continue
    var obj = {}
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j]
    oldMats.push(obj)
  }

  // Збираємо унікальні матеріали по назві
  var uniqueByName = {}
  oldMats.forEach(function(m) {
    var name = String(m.name || '').trim()
    if (!name) return
    if (!uniqueByName[name]) {
      uniqueByName[name] = {
        name:      name,
        unit:      m.unit      || '',
        stock:     num(m.stock),
        photoUrl:  m.photoUrl  || '',
        isOrdered: m.isOrdered || false,
        shopUrl:   m.shopUrl   || '',
        minStock:  num(m.minStock),
      }
    } else {
      // Беремо максимум залишку
      uniqueByName[name].stock = Math.max(uniqueByName[name].stock, num(m.stock))
    }
  })

  // Перезаписуємо Materials з новою схемою
  var newHeaders = ['id', 'name', 'unit', 'stock', 'photoUrl', 'isOrdered', 'shopUrl', 'minStock']
  matSh.clearContents()
  matSh.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])

  var newRows = []
  var nameToId = {}
  var keys = Object.keys(uniqueByName)
  for (var k = 0; k < keys.length; k++) {
    var name = keys[k]
    var m = uniqueByName[name]
    var id = 'mat_' + (Date.now() + k)
    nameToId[name] = id
    newRows.push([id, m.name, m.unit, m.stock, m.photoUrl, m.isOrdered, m.shopUrl, num(m.minStock)])
  }

  if (newRows.length) {
    matSh.getRange(2, 1, newRows.length, newHeaders.length).setValues(newRows)
  }

  // Створюємо TypeMaterials якщо нема
  var tmSh = ss.getSheetByName(SHEET.TYPE_MATS)
  if (!tmSh) {
    tmSh = ss.insertSheet(SHEET.TYPE_MATS)
    tmSh.getRange(1, 1, 1, 5).setValues([['id', 'typeId', 'matId', 'perBattery', 'minStock']])
  }

  // Заповнюємо TypeMaterials
  var tmRows = []
  var seen = {}
  oldMats.forEach(function(m) {
    var name   = String(m.name   || '').trim()
    var typeId = String(m.typeId || '').trim()
    if (!name || !typeId) return
    var key = typeId + '|' + name
    if (seen[key]) return
    seen[key] = true
    var matId = nameToId[name]
    if (!matId) return
    var id = 'tm_' + Date.now() + '_' + tmRows.length
    tmRows.push([id, typeId, matId, num(m.perBattery), num(m.minStock)])
  })

  if (tmRows.length) {
    var lastRow = tmSh.getLastRow()
    tmSh.getRange(lastRow + 1, 1, tmRows.length, 5).setValues(tmRows)
  }

  return {
    ok: true,
    message: 'Міграцію завершено. Матеріалів: ' + newRows.length + ', зв\'язків: ' + tmRows.length
  }
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
    return {
      id:          a.id,
      name:        a.name,
      outputMatId: a.outputMatId,
      outputQty:   num(a.outputQty),
      unit:        a.unit || '',
      notes:       a.notes || '',
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
      return { id: r.id, name: r.name }
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
  }
}

// ══════════════════════════════════════════════════════════════
//  МАТЕРІАЛИ (глобальний склад)
//  Колонки: 1:id 2:name 3:unit 4:stock 5:photoUrl 6:isOrdered 7:shopUrl 8:minStock
// ══════════════════════════════════════════════════════════════
function addMaterial(a, b, c, d, e, f, g) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.MATERIALS)
  ensureColumn(sh, 'minStock')

  // Backward compatible signature:
  // addMaterial(typeId, name, unit, perBattery, stock, minStock, shopUrl)
  var isOldSig = isBatteryTypeId(a)
  if (isOldSig && (g !== undefined || f !== undefined || e !== undefined)) {
    var typeId = a
    var name = b
    var unit = c
    var perBattery = num(d)
    var stock = num(e)
    var minStock = num(f)
    var shopUrl = g || ''

    var matId = findMaterialIdByName(name)
    if (!matId) {
      matId = 'mat_' + Date.now()
      sh.appendRow([matId, name, unit, stock, '', false, shopUrl, minStock])
    }

    var tmRes = ensureTypeMaterial(typeId, matId, perBattery, minStock)
    return { ok: true, id: matId, typeMatId: tmRes.id }
  }

  // New signature: addMaterial(name, unit, stock, minStock, shopUrl, photoUrl)
  var nameNew = a
  var unitNew = b
  var stockNew = num(c)
  var minStockNew = num(d)
  var shopUrlNew = e || ''
  var photoUrlNew = f || ''
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
        var newVal = Math.max(0, +((+data[i][3] || 0) + delta).toFixed(4))
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

    entry.consumed.forEach(function(c) {
      var fromStock = c.fromStock !== undefined ? c.fromStock : c.amount
      if (!fromStock || fromStock <= 0) return
      for (var i = 1; i < matData.length; i++) {
        if (String(matData[i][0]) === String(c.matId)) {
          var cur = +matData[i][3] || 0
          var nv  = Math.max(0, +(cur - fromStock).toFixed(4))
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
      var avail = +(qty - ret).toFixed(4)
      if (avail <= 0) continue
      var use    = Math.min(avail, rem)
      var newRet = +(ret + use).toFixed(4)
      sh.getRange(i + 1, 9).setValue(newRet)
      sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')
      rem = +(rem - use).toFixed(4)
    }
  }
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
      var avail = +(qty - ret).toFixed(4)
      if (avail <= 0) continue
      var use    = Math.min(avail, rem)
      var newRet = +(ret + use).toFixed(4)
      sh.getRange(i + 1, 9).setValue(newRet)
      sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')
      rem = +(rem - use).toFixed(4)
    }
  }
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
        matSh.getRange(i + 1, 4).setValue(+(cur - item.qty).toFixed(4))
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
          var nv = +(cur - it.qty).toFixed(4)
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

function returnPrep(prepId, returnQty) {
  return withLock(function() {
    var ss   = SpreadsheetApp.getActiveSpreadsheet()
    var sh   = ss.getSheetByName(SHEET.PREP)
    var data = sh.getDataRange().getValues()

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) !== String(prepId)) continue
      var qty   = +data[i][7] || 0
      var ret   = +data[i][8] || 0
      var avail = +(qty - ret).toFixed(4)
      if (returnQty > avail + 0.0001) return { ok: false, error: 'Більше ніж є на руках' }

      var newRet = +(ret + returnQty).toFixed(4)
      sh.getRange(i + 1, 9).setValue(newRet)
      sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')

      var matId   = String(data[i][4])
      var matSh   = ss.getSheetByName(SHEET.MATERIALS)
      var matData = matSh.getDataRange().getValues()
      for (var j = 1; j < matData.length; j++) {
        if (String(matData[j][0]) === matId) {
          matSh.getRange(j + 1, 4).setValue(+(+matData[j][3] + returnQty).toFixed(4))
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
    var consumed = []

    ;(entry.materials || []).forEach(function(m) {
      if (!m.selected || !m.qty) return
      for (var i = 1; i < matData.length; i++) {
        if (String(matData[i][0]) === String(m.matId)) {
          var cur = +matData[i][3] || 0
          var nv  = Math.max(0, +(cur - m.qty).toFixed(4))
          matSh.getRange(i + 1, 4).setValue(nv)
          matData[i][3] = nv
          consumed.push({ matId: m.matId, name: m.matName, unit: m.unit, amount: m.qty })
          break
        }
      }
    })

    ss.getSheetByName(SHEET.REPAIR).appendRow([
      entry.id, entry.datetime, entry.date,
      entry.serial, entry.typeName, entry.typeId,
      entry.originalWorker, entry.repairWorker,
      entry.note || '',
      JSON.stringify(entry.materials),
      'completed',
    ])

    ss.getSheetByName(SHEET.LOG).appendRow([
      entry.id + 'L', entry.datetime, entry.date,
      entry.typeId, entry.typeName, entry.repairWorker,
      0, entry.serial,
      JSON.stringify(consumed),
      'repair', entry.note || '',
    ])

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
            matSh.getRange(j + 1, 4).setValue(+(+matData[j][3] + m.qty).toFixed(4))
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
  var sh   = ss.getSheetByName(SHEET.WORKERS)
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === worker.id) {
      sh.getRange(i + 1, 2).setValue(worker.name)
      return { ok: true }
    }
  }
  sh.appendRow([worker.id, worker.name])
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
  var sh   = ss.getSheetByName(SHEET.TOOLS)
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
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
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

function repairMaterialIds() {
  return withLock(function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet()
    var matSh = ss.getSheetByName(SHEET.MATERIALS)
    if (!matSh) return { ok:false, error:'Materials не знайдено' }
    ensureColumn(matSh, 'minStock')

    var matData = matSh.getDataRange().getValues()
    if (matData.length < 2) return { ok:true, message:'Немає рядків' }

    var idMap = {}
    for (var i = 1; i < matData.length; i++) {
      var oldId = String(matData[i][0] || '')
      var newId = 'mat_' + Date.now() + '_' + i
      idMap[oldId] = newId
      matData[i][0] = newId
    }
    matSh.getRange(2, 1, matData.length - 1, matData[0].length).setValues(matData.slice(1))

    // Update TypeMaterials
    var tmSh = ss.getSheetByName(SHEET.TYPE_MATS)
    if (tmSh) {
      var tmData = tmSh.getDataRange().getValues()
      for (var r = 1; r < tmData.length; r++) {
        var old = String(tmData[r][2] || '')
        if (idMap[old]) tmData[r][2] = idMap[old]
      }
      tmSh.getRange(2,1,tmData.length-1,tmData[0].length).setValues(tmData.slice(1))
    }

    // Update AssemblyComponents
    var acSh = ss.getSheetByName(SHEET.ASSEM_COMP)
    if (acSh) {
      var acData = acSh.getDataRange().getValues()
      for (var r2 = 1; r2 < acData.length; r2++) {
        var old2 = String(acData[r2][2] || '')
        if (idMap[old2]) acData[r2][2] = idMap[old2]
      }
      acSh.getRange(2,1,acData.length-1,acData[0].length).setValues(acData.slice(1))
    }

    // Update PrepItems
    var pSh = ss.getSheetByName(SHEET.PREP)
    if (pSh) {
      ensureColumn(pSh, 'scope')
      var pData = pSh.getDataRange().getValues()
      for (var r3 = 1; r3 < pData.length; r3++) {
        var old3 = String(pData[r3][4] || '')
        if (idMap[old3]) pData[r3][4] = idMap[old3]
      }
      pSh.getRange(2,1,pData.length-1,pData[0].length).setValues(pData.slice(1))
    }

    // Update Log consumedJson
    var logSh = ss.getSheetByName(SHEET.LOG)
    if (logSh) {
      var lData = logSh.getDataRange().getValues()
      for (var r4 = 1; r4 < lData.length; r4++) {
        var cjson = lData[r4][8]
        var arr = json(cjson, null)
        if (arr && arr.length) {
          var changed = false
          arr.forEach(function(c) {
            if (c.matId && idMap[String(c.matId)]) {
              c.matId = idMap[String(c.matId)]
              changed = true
            }
          })
          if (changed) lData[r4][8] = JSON.stringify(arr)
        }
      }
      logSh.getRange(2,1,lData.length-1,lData[0].length).setValues(lData.slice(1))
    }

    return { ok:true, message:'Матеріали перестворені: ' + (matData.length-1) }
  })
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
function addAssembly(name, outputMatId, outputQty, unit, notes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.ASSEMBLIES)
  if (!sh) {
    sh = ss.insertSheet(SHEET.ASSEMBLIES)
    sh.getRange(1,1,1,6).setValues([['id','name','outputMatId','outputQty','unit','notes']])
  }
  var id = 'asm_' + Date.now()
  sh.appendRow([id, name, outputMatId, num(outputQty), unit||'', notes||''])
  return { ok:true, id:id }
}

function updateAssemblyField(asmId, field, value) {
  var colMap = { name:2, outputMatId:3, outputQty:4, unit:5, notes:6 }
  var col = colMap[field]
  if (!col) return { ok:false, error:'Невідоме поле: '+field }
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.ASSEMBLIES)
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
      var need    = +(comp.qty * totalQty).toFixed(4)
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
          var nv = Math.max(0, +(num(matData[m][3]) - c.amount).toFixed(4))
          matSh.getRange(m+1, 4).setValue(nv)
          matData[m][3] = nv
          break
        }
      }
    })

    // Додаємо готові збірки на склад (outputQty * qty штук)
    var outputAmt = +(asm.outputQty * totalQty).toFixed(4)
    for (var m=1; m<matData.length; m++) {
      if (String(matData[m][0])===String(asm.outputMatId)) {
        var newStock = +(num(matData[m][3]) + outputAmt).toFixed(4)
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
