var cnt = 1.0;
var typed_str = "";
var active_timer_idx = -1;
var selected_timer_idx = 0;

function formatsecs(seconds) {
  if (seconds < 0) {
    fullmins = Math.floor((-seconds) / 60);
    seconds = Math.floor((-seconds) % 60);
    return "-" + fullmins.toString() + ":" + seconds.toString().padStart(2, '0');
  } else {
    fullmins = Math.floor(seconds / 60);
    seconds = Math.abs(Math.floor(seconds % 60));
    return fullmins.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0');
  }
}

function formattime(date_object) {
  h = date_object.getHours();
  m = date_object.getMinutes();
  return h.toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0');
}

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

function interpolated_color(color1, color2, t) {
  r = Math.floor(color1[0] * t + color2[0] * (1 - t))
  g = Math.floor(color1[1] * t + color2[1] * (1 - t))
  b = Math.floor(color1[2] * t + color2[2] * (1 - t))
  a = Math.floor(color1[3] * t + color2[3] * (1 - t))
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}

function interpolated_rb_gradient(t) {
  t = clamp(t - 0.1, 0, 1)
  c1 = interpolated_color([6, 97, 196, 1], [193, 7, 7, 1], t)
  c2 = interpolated_color([74, 197, 248, 1], [247, 64, 69, 1], t)
  grad = { gradient: [[c1, 0], [c2, 1]] };
  return grad
}

function start_stop_timer(idx, start_or_stop) {
  if (start_or_stop == 0) { //stop
    timers[idx].circleProgress('timer_startstop', 0);
    timers[idx].removeClass("active")
  } else { //start
    timers[idx].circleProgress('timer_startstop', 1);
    timers[idx].addClass("active");
  }

}

function change_selected_to(idx) {
  timers[selected_timer_idx].circleProgress("selected", 0);
  selected_timer_idx = idx;
  timers[selected_timer_idx].circleProgress("selected", 1);
}

function timer_click(idx) {
  if (active_timer_idx < 0) {
    start_stop_timer(idx, 1);

    active_timer_idx = idx;
    change_selected_to(active_timer_idx);
  } else {
    if (idx == active_timer_idx) {
      start_stop_timer(idx, 0);
      active_timer_idx = -1;
    } else {
      start_stop_timer(active_timer_idx, 0);
      active_timer_idx = idx;
      start_stop_timer(active_timer_idx, 1);
      change_selected_to(active_timer_idx);
    }
  }

}

function update_total() {
  var total = 0;
  for (let idx in timers) {
    this_is_done = timers[idx].circleProgress('timer_done');
    if (!this_is_done) total += timers[idx].circleProgress('remaining');
  }
  $('#total_remaining').html(formatsecs(total));

  var dt_now = new Date();
  dt_now.setSeconds(dt_now.getSeconds() + total);
  $('#eom').html(formattime(dt_now));
}

function fetch_timeout(url, options, timeout = 10) {
  return Promise.race([
    fetch(url, options),
    new Promise((resolve, reject) =>
      setTimeout(() => resolve(), timeout)
    )
  ]);
}

// Set "done" property of active timer and go to next.
function toggle_done() {
  if (active_timer_idx >= 0 && active_timer_idx != selected_timer_idx) {
    return; // Special case of discussion toggled on. Don't set to done in this case.
  }

  var next_timer_idx = -1;
  if (active_timer_idx < 0) {
    timer_object = timers[selected_timer_idx];
  } else {
    timer_object = timers[active_timer_idx];
    if (typeof timers[active_timer_idx + 1] != 'undefined') {
      next_timer_idx = active_timer_idx + 1;
    }
  }
  if (timer_object != null) {
    if (active_timer_idx >= 0) {
      timer_object.circleProgress('timer_done', 1);
      start_stop_timer(active_timer_idx, 0);
      if (next_timer_idx >= 0) {
        change_selected_to(next_timer_idx);
        start_stop_timer(next_timer_idx, 1);
        active_timer_idx = next_timer_idx;
      } else {
        active_timer_idx = -1;
      }

    } else {
      timer_object.circleProgress('timer_done', -1);
    }
  }
}

function toggle_discussion() {
  var num_timers = timers.length;
  if (active_timer_idx >= 0) {
    if (active_timer_idx == num_timers - 1) {
      start_stop_timer(active_timer_idx, 0);
      active_timer_idx = selected_timer_idx;
      start_stop_timer(active_timer_idx, 1);
    } else {
      start_stop_timer(selected_timer_idx, 0);
      start_stop_timer(num_timers - 1, 1);
      active_timer_idx = num_timers - 1;
    }
  }
}

// Keyboard control (shortcuts)
// Keyboard-typing for timer adjustment of selected timer (Enter minutes then hit Enter to change timer)
$(document).keydown(function (e) {
  var num_timers = timers.length;

  if (e.keyCode == 8 || e.keyCode == 46) { // Bksp or DEL to clear timer typing value
    typed_str = "";
  } else if (e.keyCode == 13) { // RETURN (set timer value after typing it in)
    number = parseInt(typed_str);
    console.log(number);

    if (number == 0) number = 0.001;
    timers[selected_timer_idx].circleProgress('timer_init', number * 60);
    typed_str = "";
  } else {
    character_code = e.keyCode;

    // Keyboard shortcuts:
    if (String.fromCharCode(character_code) == 'D') { // D to set timer to done and continue with next
      toggle_done();
      typed_str = "";
      return false;
    } else if (String.fromCharCode(character_code) == 'C') { // C to toggle between discussion timer and selected
      toggle_discussion();
      typed_str = "";
      return false;
    } else if (character_code == 32) { // space to toggle timer
      timer_click(selected_timer_idx);
      typed_str = "";
      return false;
    } else if (character_code == 39 || character_code == 40) { //right or down
      if (selected_timer_idx + 1 < num_timers) {
        change_selected_to(selected_timer_idx + 1);
      }
      typed_str = "";
      return false;
    } else if (character_code == 37 || character_code == 38) { //left or up
      if (selected_timer_idx - 1 >= 0) {
        change_selected_to(selected_timer_idx - 1);
      }
      typed_str = "";
      return false;
    } else if (character_code >= 96 && character_code <= 105) { //NUMPAD 0-9
      character_code = character_code - 96 + 48;
    }

    typed_str += String.fromCharCode(character_code);
  }
});

// On Document loaded:  
(function ($) {
  for (let idx in timers) {
    timer = timers[idx]

    name = Object.keys(topics[idx])[0];
    properties = topics[idx][name];
    timer.circleProgress({
      full_time: properties['min'] * 60,
      remaining_time: properties['min'] * 60,
      fill: { gradient: [['#0661c4', 0], ['#4ac5f8', 1]] }
    }).on('circle-animation-progress', function (event, progress, stepValue, timerem) {
      $(this).find('strong').html(formatsecs(timerem));

      if ($(this).circleProgress('timer_done')) {
        $(this).addClass("done");
        $(this).circleProgress('fill', { gradient: [['#066155', 0], ['#4ac555', 1]] });  //green = done
      } else {
        $(this).removeClass("done");
        $(this).circleProgress('fill', interpolated_rb_gradient(stepValue));
      }

    }).on('click', function () {
      timer_click(parseInt(idx));
    });

  }

  timers[selected_timer_idx].circleProgress("selected", 1);
  setInterval(update_total, 200);

})(jQuery);
