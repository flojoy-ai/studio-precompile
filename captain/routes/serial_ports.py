import serial.tools.list_ports
from fastapi import APIRouter
from captain.utils.logger import logger
from captain.utils.microcontroller_ping import test_mc

router = APIRouter(tags=["serial_ports"])


test_microcontroller = (
    "",
    "",
    "Not an MC, or Micropython not installed",
)  # THIS WILL SIMPLY MAKE SURE THAT MICROPYTHON RUNS


class SerialPortList:
    def __init__(self, ports):
        self.ports = ports


def is_mc(port) -> bool:
    return port and "MicroPython" in str(port.manufacturer)


@router.get("/serial_ports", summary="get serial ports")
async def get_serial_ports():
    serial_ports = list(serial.tools.list_ports.comports())
    serial_ports = list(filter(is_mc, serial_ports))
    return SerialPortList(list(serial_ports))
