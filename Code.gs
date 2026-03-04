// ══════════════════════════════════════════════════════════════
//  ZmiyCell — Google Apps Script  (Code.gs)
//  Версія для Vercel + проксі (api/gas.js)
//  Усі запити приходять GET: ?action=назваФункції&params=[...]
// ══════════════════════════════════════════════════════════════

var SHEET = {
  CONFIG:    'Config',
  BATTERY:   'BatteryTypes',
  MATERIALS: 'Materials',
  WORKERS:   'Workers',
  TOOLS:     'Tools',
  LOG:       'Log',
  REPAIR:    'RepairLog',
  PREP:      'PrepItems',
}

// ── Точка входу GET ────────────────────────────────────────
function doGet(e) {
  var result
  try {
    var action = e.parameter.action || ''
    var params = e.parameter.params
      ? JSON.parse(decodeURIComponent(e.parameter.params))
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

// ── Таблиця дій ────────────────────────────────────────────
var ACTIONS = {
  loadAll:               loadAll,
  initSheets:            initSheets,
  writeOff:              writeOff,
  addPrepItem:           addPrepItem,
  returnPrep:            returnPrep,
  addRepair:             addRepair,
  returnRepairMaterials: returnRepairMaterials,
  deleteRepair:          deleteRepair,
  updateMaterialStock:   updateMaterialStock,
  updateMaterialField:   updateMaterialField,
  addMaterial:           addMaterial,
  deleteMaterial:        deleteMaterial,
  saveWorker:            saveWorker,
  deleteWorker:          deleteWorker,
  saveTool:              saveTool,
  deleteTool:            deleteTool,
}

// ══════════════════════════════════════════════════════════════
//  ІНІЦІАЛІЗАЦІЯ — запустити вручну один раз через редактор
// ══════════════════════════════════════════════════════════════
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  ensureSheet(ss, SHEET.CONFIG,
    ['key', 'value'],
    [['initialized', new Date().toISOString()]]
  )

  ensureSheet(ss, SHEET.BATTERY,
    ['id', 'name', 'color'],
    [
      ['typeA', '16S3P 230Ah SK Innovation', '#f97316'],
      ['typeB', '15S1P 150Ah CATL',          '#06b6d4'],
    ]
  )

  ensureSheet(ss, SHEET.MATERIALS,
    ['id', 'typeId', 'name', 'unit', 'perBattery', 'stock', 'minStock', 'photoUrl'],
    buildDefaultMaterials()
  )

  ensureSheet(ss, SHEET.WORKERS,
    ['id', 'name'],
    [
      ['w1', 'Іваненко О.'], ['w2', 'Петренко В.'],
      ['w3', 'Сидоренко М.'],['w4', 'Коваленко Т.'],
      ['w5', 'Бойченко Р.'], ['w6', 'Мельник Д.'],
    ]
  )

  ensureSheet(ss, SHEET.TOOLS,
    ['id', 'name', 'category', 'count', 'working', 'serial', 'notes'],
    [
      ['t1', 'Зварювальний апарат точковий', 'equipment', 2, 2, 'SW-001', ''],
      ['t2', 'Паяльна станція',              'tool',      4, 4, '',       ''],
      ['t3', 'Мультиметр',                   'tool',      3, 3, '',       ''],
      ['t4', 'Аналізатор ємності',           'equipment', 2, 1, 'CA-002', '1 на ремонті'],
      ['t5', 'Термофен',                     'tool',      3, 3, '',       ''],
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
    ['id','workerId','workerName','typeId','matId','matName','unit','qty','returnedQty','date','datetime','status'],
    []
  )

  return { ok: true, message: 'Ініціалізацію завершено' }
}

// ── Допоміжна: створити аркуш якщо не існує ────────────────
function ensureSheet(ss, name, headers, rows) {
  var sh = ss.getSheetByName(name)
  if (!sh) {
    sh = ss.insertSheet(name)
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
    if (rows.length) {
      sh.getRange(2, 1, rows.length, headers.length).setValues(rows)
    }
  }
  return sh
}

// ══════════════════════════════════════════════════════════════
//  ЗАВАНТАЖЕННЯ ВСІХ ДАНИХ
// ══════════════════════════════════════════════════════════════
function loadAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()

  var btRows  = rows(ss, SHEET.BATTERY)
  var matRows = rows(ss, SHEET.MATERIALS)
  var wRows   = rows(ss, SHEET.WORKERS)
  var tRows   = rows(ss, SHEET.TOOLS)
  var lRows   = rows(ss, SHEET.LOG)
  var rRows   = rows(ss, SHEET.REPAIR)
  var pRows   = rows(ss, SHEET.PREP)

  var batteryTypes = btRows.map(function(bt) {
    return {
      id: bt.id, name: bt.name, color: bt.color,
      materials: matRows
        .filter(function(m) { return m.typeId === bt.id })
        .map(function(m) {
          return {
            id: m.id, name: m.name, unit: m.unit,
            perBattery: num(m.perBattery),
            stock:      num(m.stock),
            minStock:   num(m.minStock),
            photoUrl:   m.photoUrl || null,
          }
        }),
    }
  })

  return {
    ok: true,
    batteryTypes: batteryTypes,

    workers: wRows.map(function(r) {
      return { id: r.id, name: r.name }
    }),

    tools: tRows.map(function(r) {
      return {
        id: r.id, name: r.name, category: r.category,
        count:   int(r.count),
        working: int(r.working),
        serial: r.serial || '', notes: r.notes || '',
      }
    }),

    log: lRows.map(function(r) {
      return {
        id: r.id, datetime: r.datetime, date: r.date,
        typeId: r.typeId, typeName: r.typeName,
        workerName: r.workerName,
        count:   int(r.count),
        serials: r.serials ? r.serials.split('|') : [],
        consumed: json(r.consumedJson, []),
        kind: r.kind || 'production',
        repairNote: r.repairNote || '',
      }
    }).reverse(),

    repairLog: rRows.map(function(r) {
      return {
        id: r.id, datetime: r.datetime, date: r.date,
        serial: r.serial, typeName: r.typeName, typeId: r.typeId,
        originalWorker: r.originalWorker, repairWorker: r.repairWorker,
        note: r.note || '',
        materials: json(r.materialsJson, []),
        status: r.status || 'completed',
      }
    }).reverse(),

    prepItems: pRows.map(function(r) {
      return {
        id: r.id, workerId: r.workerId, workerName: r.workerName,
        typeId: r.typeId, matId: r.matId, matName: r.matName,
        unit: r.unit,
        qty:         num(r.qty),
        returnedQty: num(r.returnedQty),
        date: r.date, datetime: r.datetime,
        status: r.status || 'active',
      }
    }),
  }
}

// ══════════════════════════════════════════════════════════════
//  МАТЕРІАЛИ
// ══════════════════════════════════════════════════════════════
function updateMaterialStock(typeId, matId, delta) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.MATERIALS)
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === typeId && data[i][0] === matId) {
      var newVal = Math.max(0, +((+data[i][5] || 0) + delta).toFixed(4))
      sh.getRange(i + 1, 6).setValue(newVal)
      return { ok: true, stock: newVal }
    }
  }
  return { ok: false, error: 'Матеріал не знайдено' }
}

function updateMaterialField(typeId, matId, field, value) {
  var colMap = { name: 3, unit: 4, perBattery: 5, stock: 6, minStock: 7, photoUrl: 8 }
  var col = colMap[field]
  if (!col) return { ok: false, error: 'Невідоме поле: ' + field }

  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.MATERIALS)
  var data = sh.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === typeId && data[i][0] === matId) {
      sh.getRange(i + 1, col).setValue(value)
      return { ok: true }
    }
  }
  return { ok: false, error: 'Не знайдено' }
}

function addMaterial(typeId, name, unit, perBattery, stock, minStock) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(SHEET.MATERIALS)
  var id = typeId.charAt(0) + '_' + Date.now()
  sh.appendRow([id, typeId, name, unit, perBattery, stock, minStock, ''])
  return { ok: true, id: id }
}

function deleteMaterial(typeId, matId) {
  return deleteRowWhere(SHEET.MATERIALS, function(r) {
    return r[1] === typeId && r[0] === matId
  })
}

// ══════════════════════════════════════════════════════════════
//  СПИСАННЯ (ВИРОБНИЦТВО)
// ══════════════════════════════════════════════════════════════
function writeOff(entry) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  var matData = matSh.getDataRange().getValues()

  // Списуємо зі складу (тільки fromStock)
  entry.consumed.forEach(function(c) {
    var fromStock = c.fromStock !== undefined ? c.fromStock : c.amount
    if (!fromStock || fromStock <= 0) return
    for (var i = 1; i < matData.length; i++) {
      if (matData[i][1] === entry.typeId && matData[i][2] === c.name) {
        var cur = +matData[i][5] || 0
        var nv  = Math.max(0, +(cur - fromStock).toFixed(4))
        matSh.getRange(i + 1, 6).setValue(nv)
        matData[i][5] = nv
        break
      }
    }
  })

  // Закриваємо заготовки (fromPrep)
  entry.consumed.forEach(function(c) {
    if (!c.fromPrep || c.fromPrep <= 0) return
    deductPrep(ss, entry.workerName, entry.typeId, c.name, c.fromPrep)
  })

  // Запис у журнал
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
}

// Вираховуємо заготовку для конкретного матеріалу
function deductPrep(ss, workerName, typeId, matName, needed) {
  var sh   = ss.getSheetByName(SHEET.PREP)
  var data = sh.getDataRange().getValues()
  var rem  = needed
  for (var i = 1; i < data.length && rem > 0; i++) {
    if (
      data[i][2]  === workerName &&
      data[i][3]  === typeId &&
      data[i][5]  === matName &&
      data[i][11] !== 'returned'
    ) {
      var qty  = +data[i][7] || 0
      var ret  = +data[i][8] || 0
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
  var ss    = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  var matData = matSh.getDataRange().getValues()

  // Перевіряємо залишок і списуємо
  for (var i = 1; i < matData.length; i++) {
    if (matData[i][1] === item.typeId && matData[i][0] === item.matId) {
      var cur = +matData[i][5] || 0
      if (cur < item.qty) return { ok: false, error: 'Не вистачає матеріалу на складі' }
      matSh.getRange(i + 1, 6).setValue(+(cur - item.qty).toFixed(4))
      break
    }
  }

  // Запис PrepItems
  ss.getSheetByName(SHEET.PREP).appendRow([
    item.id, item.workerId, item.workerName,
    item.typeId, item.matId, item.matName,
    item.unit, item.qty, 0,
    item.date, item.datetime, 'active',
  ])

  // Запис у журнал
  ss.getSheetByName(SHEET.LOG).appendRow([
    item.id + 'P', item.datetime, item.date,
    item.typeId, '', item.workerName,
    0, '',
    JSON.stringify([{ name: item.matName, unit: item.unit, amount: item.qty }]),
    'prep', '',
  ])

  return { ok: true }
}

function returnPrep(prepId, returnQty) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.PREP)
  var data = sh.getDataRange().getValues()

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(prepId)) continue

    var qty   = +data[i][7] || 0
    var ret   = +data[i][8] || 0
    var avail = +(qty - ret).toFixed(4)

    if (returnQty > avail + 0.0001)
      return { ok: false, error: 'Більше ніж є на руках' }

    var newRet = +(ret + returnQty).toFixed(4)
    sh.getRange(i + 1, 9).setValue(newRet)
    sh.getRange(i + 1, 12).setValue(newRet >= qty ? 'returned' : 'partial')

    // Повертаємо на склад
    var matSh   = ss.getSheetByName(SHEET.MATERIALS)
    var matData = matSh.getDataRange().getValues()
    for (var j = 1; j < matData.length; j++) {
      if (matData[j][1] === data[i][3] && matData[j][0] === data[i][4]) {
        matSh.getRange(j + 1, 6).setValue(+(+matData[j][5] + returnQty).toFixed(4))
        break
      }
    }
    return { ok: true }
  }
  return { ok: false, error: 'Запис не знайдено' }
}

// ══════════════════════════════════════════════════════════════
//  РЕМОНТ
// ══════════════════════════════════════════════════════════════
function addRepair(entry) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet()
  var matSh = ss.getSheetByName(SHEET.MATERIALS)
  var matData = matSh.getDataRange().getValues()

  var consumed = []
  ;(entry.materials || []).forEach(function(m) {
    if (!m.selected || !m.qty) return
    for (var i = 1; i < matData.length; i++) {
      if (matData[i][1] === entry.typeId && matData[i][0] === m.matId) {
        var cur = +matData[i][5] || 0
        var nv  = Math.max(0, +(cur - m.qty).toFixed(4))
        matSh.getRange(i + 1, 6).setValue(nv)
        matData[i][5] = nv
        consumed.push({ name: m.matName, unit: m.unit, amount: m.qty })
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
}

function returnRepairMaterials(repairId, matIds) {
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
        if (matData[j][1] === data[i][5] && matData[j][0] === m.matId) {
          var cur = +matData[j][5] || 0
          matSh.getRange(j + 1, 6).setValue(+(cur + m.qty).toFixed(4))
          break
        }
      }
    })
    return { ok: true }
  }
  return { ok: false, error: 'Запис ремонту не знайдено' }
}

function deleteRepair(repairId) {
  return deleteRowWhere(SHEET.REPAIR, function(r) {
    return String(r[0]) === String(repairId)
  })
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
//  ІНСТРУМЕНТИ
// ══════════════════════════════════════════════════════════════
function saveTool(tool) {
  var ss   = SpreadsheetApp.getActiveSpreadsheet()
  var sh   = ss.getSheetByName(SHEET.TOOLS)
  var data = sh.getDataRange().getValues()
  var row  = [tool.id, tool.name, tool.category, tool.count, tool.working, tool.serial || '', tool.notes || '']
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === tool.id) {
      sh.getRange(i + 1, 1, 1, 7).setValues([row])
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

// Перетворює аркуш у масив об'єктів
function rows(ss, name) {
  var sh = ss.getSheetByName(name)
  if (!sh || sh.getLastRow() < 2) return []
  var data    = sh.getDataRange().getValues()
  var headers = data[0]
  var result  = []
  for (var i = 1; i < data.length; i++) {
    var obj = {}
    for (var j = 0; j < headers.length; j++) {
      var v = data[i][j]
      obj[headers[j]] = (v !== undefined && v !== null) ? String(v) : ''
    }
    result.push(obj)
  }
  return result
}

// Видалити перший рядок що відповідає predicate(rowArray)
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

function num(v) { return parseFloat(v) || 0 }
function int(v) { return parseInt(v)   || 0 }
function json(s, def) { try { return s ? JSON.parse(s) : def } catch(_) { return def } }

// ── Стандартні матеріали (для initSheets) ──────────────────
function buildDefaultMaterials() {
  var defs = [
    ['Комірки акумулятора',        'шт', 48,   500, 100],
    ['BMS плата',                  'шт',  1,    20,   5],
    ['Нікелева стрічка',           'м',   2.5,  80,  15],
    ['Корпус (кейс)',              'шт',  1,    15,   3],
    ["Роз'єм XT90",               'шт',  2,    60,  10],
    ['Термоусадка',                'м',   0.5,  40,   5],
    ['Ізоляційна стрічка',        'м',   1.5, 120,  20],
    ['Балансувальні дроти',        'шт',  1,    18,   4],
    ['Провід 10AWG червоний',      'м',   0.4,  25,   5],
    ['Провід 10AWG чорний',        'м',   0.4,  25,   5],
    ["Роз'єм JST балансувальний", 'шт',  1,    30,   8],
    ['Паяльний флюс',              'мл',  2,   200,  50],
    ['Припій ПОС-60',              'г',   5,   300,  80],
    ['Ізолятор торцевий',          'шт',  4,   100,  20],
    ['Плата захисту від перезаряду','шт', 1,    12,   3],
    ['Термістор NTC',              'шт',  1,    22,   5],
    ['Стяжка кабельна',            'шт',  6,   500, 100],
    ['Двосторонній скотч',         'м',   0.2,  15,   3],
    ['Клей епоксидний',            'г',   3,   150,  30],
    ['Гвинти M3x6',                'шт',  8,   400,  80],
    ['Гайка M3',                   'шт',  8,   400,  80],
    ['Шайба M3',                   'шт', 16,   600, 100],
    ['Пінопластова прокладка',     'шт',  2,    40,  10],
    ['Силіконовий герметик',       'г',   4,   200,  50],
    ['Індикатор заряду LED',       'шт',  1,    18,   4],
    ['Резистор 100 Ом',            'шт',  2,    80,  20],
    ['Конденсатор 100мкФ',         'шт',  1,    35,   8],
    ['Виводи нікелеві U-подібні',  'шт', 12,   200,  50],
    ['Малярська стрічка',          'м',   0.3,  30,   5],
    ['Папір наждачний P400',       'шт',  0.5,  20,   5],
    ['Мастило контактне',          'мл',  1,   100,  20],
    ['Стікер маркування QR',       'шт',  1,   150,  30],
    ['Пакувальна плівка стрейч',   'м',   0.5,  40,   8],
    ['Карта контролю якості',      'шт',  1,   100,  20],
    ['Поліетиленовий пакет',       'шт',  1,    80,  15],
  ]

  var result = []
  ;[['A','typeA'],['B','typeB']].forEach(function(pair) {
    defs.forEach(function(d, i) {
      result.push([pair[0] + '_' + (i + 1), pair[1], d[0], d[1], d[2], d[3], d[4], ''])
    })
  })
  return result
}
