const electron = require('electron')
const path = require('path')
const url = require('url')
const mysql = require('mysql')

// SET ENV
process.env.NODE_ENV = 'development'

// Add the credentials to access your database
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'booklibrary'
})

connection.connect(function (err) {
  if (err) {
    console.log(err.code)
    console.log(err.fatal)
  }
})

const {app, BrowserWindow, Menu, ipcMain} = electron

let mainWindow
let addWindow

// Listen for app to be ready
app.on('ready', function () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false
  })
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  mainWindow.on('closed', function () {
    app.quit()
  })

  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate)
  Menu.setApplicationMenu(mainMenu)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
})

// Handle add item window
function createAddWindow () {
  addWindow = new BrowserWindow({
    width: 800,
    height: 650,
    title: 'Thêm sách'
  })
  addWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'addWindow.html'),
    protocol: 'file:',
    slashes: true
  }))
  // Handle garbage collection
  addWindow.on('close', function () {
    addWindow = null
  })
}

ipcMain.on('page:load', function (e) {
  const query = `SELECT * FROM books`
  connection.query(query, function (err, rows, fields) {
    if (err) {
      console.log('An error ocurred performing the query.')
      console.log(err)
      return
    }

    mainWindow.webContents.send('page:loaded', rows)
  })
})

// Catch item:add
ipcMain.on('item:add', function (e, data) {
  const query = `INSERT INTO books (name, author, printer, number, nts) VALUES ('${data[0].value}','${data[1].value}','${data[2].value}','${data[3].value}','${data[4].value}')`
  connection.query(query, function (err, rows, fields) {
    if (err) {
      console.log('An error ocurred performing the query.')
      console.log(err)
      return
    }

    console.log('Query succesfully executed', rows)
    data.push({name: 'id', value: rows.insertId})
    console.log(data)

    mainWindow.webContents.send('item:add', data)
    addWindow.close()
  })
  // Still have a reference to addWindow in memory. Need to reclaim memory (Grabage collection)
  // addWindow = null;
})

ipcMain.on('book:edit', function (e, book) {
  console.log(book)

  const query = `UPDATE books SET name='${book[1].value}',author='${book[2].value}',printer='${book[3].value}',number='${book[4].value}',nts='${book[5].value}' WHERE id='${book[0].value}'`

  connection.query(query, function (err, rows, fields) {
    if (err) {
      console.log('An error ocurred performing the query.')
      console.log(err)
      return
    }

    console.log('Query succesfully executed', rows)
    mainWindow.webContents.send('book:edited', book)
  })
})

ipcMain.on('book:delete', function (e, bookId) {
  const query = `DELETE FROM books WHERE id='${bookId}'`

  connection.query(query, function (err, rows, fields) {
    if (err) {
      console.log('An error ocurred performing the query.')
      console.log(err)
      return
    }

    console.log('Book deleted', rows)
  })
})

// Create menu template
const mainMenuTemplate = [
  // Each object is a dropdown
  {
    label: 'Quản lý',
    submenu: [
      {
        label: 'Thêm sách',
        click () {
          createAddWindow()
        }
      },
      {
        label: 'Thoát',
        accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click () {
          app.quit()
        }
      }
    ]
  }
]

// If OSX, add empty object to menu
if (process.platform == 'darwin') {
  mainMenuTemplate.unshift({})
}

// Add developer tools option if in dev
// if (process.env.NODE_ENV !== 'production') {
//   mainMenuTemplate.push({
//     label: 'Developer Tools',
//     submenu: [
//       {
//         role: 'reload'
//       },
//       {
//         label: 'Toggle DevTools',
//         accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
//         click (item, focusedWindow) {
//           focusedWindow.toggleDevTools()
//         }
//       }
//     ]
//   })
// }
