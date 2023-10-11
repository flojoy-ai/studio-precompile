"""
This command limits the angular velocities of the robot joints. It affects the movements
generated by the MovePose and MoveJoints commands.
Arguments:
- p: percentage of maximum joint velocities, ranging from 1 to 100%
Default values:
By default, the limit is set to 25%.
Note that it is not possible to limit the velocity of only one joint. With this command, the
maximum velocities of all joints are limited proportionally. In other words, the maximum
velocity of each joint will be reduced to a percentage p of its top velocity. The top velocity
of joints 1 and 2 is 150◦/s, of joint 3 is 180◦/s, of joints 4 and 5 is 300◦/s, and of joint 6 is
500◦/s


Parameters
    - current: the joints present position (6 element array of numbers)
    - next: the next position the joints will go to
    - timeDelta: the amount of time (in milliseconds) that the move should take
"""


def calculateLimitingMaxVel(current, next, timeDelta) -> float:
    # TODO: we can add virtual points between the keyframes and enable blending for more smooth moves?
    deltaPosititons = [abs(current[i] - next[i]) for i in range(len(current))]  # the delta positions of each axis in degrees
    velocities = [150, 150, 180, 300, 300, 500]  # the max velocities of each axis in degrees per second
    maxVelocities = [deltaPosititons[i] / (timeDelta / 1000) for i in range(len(deltaPosititons))]  # the max velocities of each axis in degrees per second
    highestVelRatio = (-1, -1)  # the highest velocity ratio and the index of the axis
    for i in range(len(maxVelocities)):
        ratio = maxVelocities[i] / velocities[i]
        if ratio > highestVelRatio[0]:
            highestVelRatio = (ratio, i)

    idxOfAxisToLimit = highestVelRatio[1]
    targetVelofAxisToLimit = maxVelocities[idxOfAxisToLimit]
    ratioOfMaxtoTarget = velocities[idxOfAxisToLimit] / targetVelofAxisToLimit
    if ratioOfMaxtoTarget > 1:
        print("WARNING: The target velocity is higher than the max velocity of the axis. The axis will be limited to 100% of its max velocity.")
    if ratioOfMaxtoTarget < 0:
        print("WARNING: The target velocity is negative. The axis will be limited to 100% of its max velocity.")
    return abs(min(1, ratioOfMaxtoTarget))
