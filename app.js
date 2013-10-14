var express = require('express');
var routes = require('./routes');
var io = require('socket.io');

var app = module.exports = express.createServer();
var io = io.listen(app);

var serialport = require('serialport');
var portName = '/dev/tty.usbmodem1421';
var sp = new serialport.SerialPort(portName, {
    baudRate: 31250,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    parser: serialport.parsers.readline("\n") 
});


// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

// Functions

var midi = require('midi');
var midiOut = new midi.output();
var midiIn = new midi.input();


try {
  midiOut.openPort(0);
} catch(error) {
  midiOut.openVirtualPort('');
}

try {
  midiIn.openPort(0);
} catch(error) {
  midiIn.openVirtualPort('');
}

var stream = midi.createReadStream(midiIn);

  
var buffer = new Array();

io.sockets.on('connection', function (socket) {
  sp.on('data', function(input){
    var arduino_data = input;
    
    input = parseInt(input);
    buffer.push(input);
    if (buffer.length == 6) {
      var message = new Array(buffer[0], buffer[2], buffer[4]);
      console.log(message);
      io.sockets.emit('msg', {message : message});
      
      buffer.splice(0, 5);
    }
    
    //  socket.emit('one', {led : arduino_data});    
  });
  
  midiIn.on('message', function(deltaTime, message) {
    console.log('m:' + message + ' d:' + deltaTime);

    io.sockets.emit('msg', {message : message});
  });

/*
  // note
  socket.on('notedown',function(data){
    midiOdata.message,100]);
    console.log('Notedown: ' + data.message);
    socket.broadcast.emit('playeddown',{'message':data.message});
  });

  // note stop
  socket.on('noteup',function(data){
    midiOut.sendMessage([128,data.message,100]);
    console.log('Noteup : ' + data.message);
    socket.broadcast.emit('playedup',{'message':data.message});
  });

  // controller
  socket.on('controller',function(data){
    var message = parseInt(data.message,10);
    console.log('Log : ' + data.message);
    midiOut.sendMessage([message,0,0]);
  });
*/

});
// Stop

process.on("SIGTERM", function(){
  midiOut.closePort();
});

// Start

app.listen(3000);
