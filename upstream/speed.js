let t1 = +new Date() / 1000; //current time in seconds
function calculate_speed(acceleration) {
  let t2 = (+new Date()) / 1000; //current time in seconds
  let final_time = t2 - t1;
  speed =  1/2 * acceleration * final_time;
  console.log(speed)
  t1 = t2;
}

abc();
