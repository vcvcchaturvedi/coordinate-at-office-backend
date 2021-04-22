const cors = require("cors");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(index);
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
}); // < Interesting!
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => console.log("Client disconnected"));
});

// io.set('transports', [
//     // 'websocket',
//     'xhr-polling',
//     'jsonp-polling'
// ]);

var channels = {};

io.sockets.on("connection", function (socket) {
  var initiatorChannel = "";
  if (!io.isConnected) {
    io.isConnected = true;
  }

  socket.on("new-channel", function (data) {
    console.log("New channel - " + JSON.stringify(data));
    if (!channels[data.channel]) {
      initiatorChannel = data.channel;
    }

    channels[data.channel] = data.channel;
    onNewNamespace(data.channel, data.sender);
    console.log("done");
  });

  socket.on("presence", function (channel) {
    var isChannelPresent = !!channels[channel];
    socket.emit("presence", isChannelPresent);
  });

  socket.on("disconnect", function (channel) {
    if (initiatorChannel) {
      delete channels[initiatorChannel];
    }
  });
});

function onNewNamespace(channel, sender) {
  io.of("/" + channel).on("connection", function (socket) {
    console.log("Main client connected!");

    var username;
    if (io.isConnected) {
      io.isConnected = false;
      socket.emit("connectup", true);
    }

    socket.on("message", function (data) {
      if (data.sender == sender) {
        if (!username) username = data.data.sender;

        socket.broadcast.emit("message", data.data);
        // console.log(JSON.stringify(data));
      }
    });

    socket.on("disconnect", function () {
      if (username) {
        socket.broadcast.emit("user-left", username);
        username = null;
      }
    });
  });
}
server.listen(port, () => console.log(`Listening on port ${port}`));
