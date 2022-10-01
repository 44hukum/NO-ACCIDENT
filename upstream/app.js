const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

/**
 *  SOCKET
 *
 */

let clientSocket = require("socket.io-client").connect("http://localhost:4000");
/**
 *  END OF SOCKET
 *
 */

const { SerialPort, ReadlineParser } = require("serialport");
const { io } = require("socket.io-client");
const port = new SerialPort({
  path: "/dev/ttyACM0",
  baudRate: 115200,
});
let initial_time = +new Date() / 1000;

const parser = new ReadlineParser();
port.pipe(parser);
parser.on("data", parse_data);

// Parse data
function parse_data(data) {
  let final_time = +new Date() / 1000;
  let reading = JSON.stringify(data).split(",");
  let values; //for sensor data
  let temperature;
  try {
    if (reading.length == 1) {
      temperature = reading[0].replace('\\r"', "").replace('"', "");

      clientSocket.emit("temperature", parseInt(temperature)); //temperature for fronten
    }
    if (reading.length == 6) {
      values = [
        normalize_raw_acceleration(reading[0].replace('"', "")),
        normalize_raw_acceleration(reading[1]),
        normalize_raw_acceleration(reading[2]),
        normalize_raw_gyroscope(reading[3]),
        normalize_raw_gyroscope(reading[4]),
        normalize_raw_gyroscope(reading[5].replace('\\r"', "")),
      ];
      // Calculation
      forward_roll = actan_calculation(values[0], values[1], [2]).toFixed(3);
      backward_roll = actan_calculation(values[1], values[0], values[2]).toFixed(3);
      speed = final_speed(values, final_time).toFixed(3);
      if(speed > 50){
        console.log('speed voilated')
        send_email("Speed voilated",'vehicle 001  speed voilation', new Date(), speed);
      }
      clientSocket.emit(
        //client emit
        "data",
        JSON.stringify({
          data: values,
          speed: speed,
          forward_roll: forward_roll,
          backward_roll: backward_roll,
        })
      );
    }   
  } catch {}
}

function normalize_raw_acceleration(value) {
  return Math.abs(value); //since our mpu use +2LBS
}
function normalize_raw_gyroscope(value) {
  return Math.abs(value);
}

// Calculate Speed

function final_speed(values, final_time) {
  let m_x = calculate_speed_in_one_axis(values[0], initial_time, final_time);
  let m_y = calculate_speed_in_one_axis(values[1], initial_time, final_time);
  let m_z = calculate_speed_in_one_axis(values[2], initial_time, final_time);

  initial_time = final_time;

  return Math.sqrt(Math.pow(m_x, 2) + Math.pow(m_y, 2) + Math.pow(m_z, 2)); //speed in KM/hr
}

function calculate_speed_in_one_axis(acceleration, initial_time, final_time) {
  return (speed = (1 / 2) * acceleration * (final_time - initial_time)); //v0+1/2*a*t^2
}

// Calculate PITCH / ROLL IN DEGREE
function actan_calculation(x, y, z) {
  let data = x / Math.sqrt(y * y + z * z);
  let degree = 180.0 / 3.14;
  let in_degree = Math.atan(data) * degree;
  return in_degree;
}

const nodemailer = require("nodemailer");

let transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "dac90af4849279",
      pass: "1b6db3712edd45"
    }
  });

const send_email = ((data,subject,date,speed)=>{
  let info = transport.sendMail({ //send emails
    from: 'someone@example.com', // sender address
    to: 'abc@gmail.com', // list of receivers
    subject: subject, // Subject line
    text: data + ": at"+date + speed, // plain text body
   
},(err,info)=>{
    if (err) return err
    if (info) return info
})})

/**
 *
 *  ENDS
 *
 */

server.listen(6000, () => {
  console.log(`http://localhost:${6000}`);
});
