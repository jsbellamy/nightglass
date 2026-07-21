//! Throwaway spike: two always-on-top windows, dock as child of tile (tao Parent::ChildOf).
//! Run: `cargo run -p dock-child-window-spike` from this directory.

use std::time::{Duration, Instant};
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoop};
use tao::platform::macos::{WindowBuilderExtMacOS, WindowExtMacOS};
use tao::window::WindowBuilder;

fn main() {
  let event_loop = EventLoop::new();
  let tile = WindowBuilder::new()
    .with_title("tile (parent)")
    .with_inner_size(tao::dpi::LogicalSize::new(480.0, 112.0))
    .with_decorations(false)
    .with_always_on_top(true)
    .build(&event_loop)
    .expect("tile");

  let parent_ns = tile.ns_window();

  let dock = WindowBuilder::new()
    .with_title("dock (child)")
    .with_inner_size(tao::dpi::LogicalSize::new(480.0, 336.0))
    .with_decorations(false)
    .with_always_on_top(true)
    .with_parent_window(parent_ns)
    .with_position(tao::dpi::LogicalPosition::new(0.0, -344.0))
    .build(&event_loop)
    .expect("dock");


  let mut phase = 0u8;
  let mut wait_until: Option<Instant> = None;

  event_loop.run(move |event, _, control_flow| {
    if let Some(until) = wait_until {
      *control_flow = ControlFlow::WaitUntil(until);
    } else {
      *control_flow = ControlFlow::Wait;
    }
    match event {
      Event::NewEvents(tao::event::StartCause::Init) => {
        let tile_pos = tile.outer_position().unwrap();
        let dock_pos = dock.outer_position().unwrap();
        eprintln!(
          "init tile=({}, {}) dock=({}, {}) tile_aot={} dock_aot={}",
          tile_pos.x,
          tile_pos.y,
          dock_pos.x,
          dock_pos.y,
          tile.is_always_on_top(),
          dock.is_always_on_top()
        );
        phase = 1;
        wait_until = Some(Instant::now() + Duration::from_millis(200));
      }
      Event::NewEvents(tao::event::StartCause::ResumeTimeReached { .. }) if phase == 1 => {
        let pos = tile.outer_position().unwrap();
        tile.set_outer_position(tao::dpi::Position::Logical(tao::dpi::LogicalPosition::new(
          pos.x as f64 + 80.0,
          pos.y as f64,
        )));
        phase = 2;
        wait_until = Some(Instant::now() + Duration::from_millis(200));
      }
      Event::NewEvents(tao::event::StartCause::ResumeTimeReached { .. }) if phase == 2 => {
        let tile_pos = tile.outer_position().unwrap();
        let dock_pos = dock.outer_position().unwrap();
        eprintln!(
          "after tile+80x tile=({}, {}) dock=({}, {})",
          tile_pos.x, tile_pos.y, dock_pos.x, dock_pos.y
        );
        dock.set_outer_position(tao::dpi::Position::Logical(tao::dpi::LogicalPosition::new(
          dock_pos.x as f64,
          dock_pos.y as f64 - 50.0,
        )));
        phase = 3;
        wait_until = Some(Instant::now() + Duration::from_millis(200));
      }
      Event::NewEvents(tao::event::StartCause::ResumeTimeReached { .. }) if phase == 3 => {
        let dock_pos = dock.outer_position().unwrap();
        eprintln!("after dock set_position -50y dock=({}, {})", dock_pos.x, dock_pos.y);
        dock.set_visible(false);
        dock.set_visible(true);
        let dock_after_show = dock.outer_position().unwrap();
        eprintln!(
          "after hide/show dock=({}, {})",
          dock_after_show.x, dock_after_show.y
        );
        *control_flow = ControlFlow::Exit;
      }
      Event::WindowEvent {
        window_id,
        event: WindowEvent::CloseRequested,
        ..
      } => {
        if window_id == dock.id() {
          *control_flow = ControlFlow::Exit;
        }
      }
      _ => {}
    }
  });
}
