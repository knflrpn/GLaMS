import pyperclip
import numpy as np
from PIL import Image

def getColorDist(current, desired):
    err = desired - current
    err = (err+8)%17-8
    return err

def getMoveCommands(start_x, start_y, end_x, end_y, prev_cmd):
    # Insert movement
    moves = []
    # start with largest direction
    if abs(end_x-start_x) > abs(end_y-start_y):
        if start_x < end_x:
            moves.append('R')
            start_x += 1
        else:
            moves.append('L')
            start_x -= 1
    elif start_y != end_y:
        if start_y < end_y:
            moves.append('D')
            start_y += 1
        else:
            moves.append('U')
            start_y -= 1

    # Check for repeated movement
    if (len(moves) > 0):
        if moves[0] in prev_cmd.split(' '):
            moves.append(moves[0])
            moves[0] = ''

    # Add movements until at destination
    while (end_x != start_x) or (end_y != start_y):
        skipped = 0
        if (end_x != start_x) and not (moves[-1]=='R' or moves[-1]=='L'):
            if start_x < end_x:
                moves.append('R')
                start_x += 1
            else:
                moves.append('L')
                start_x -= 1
        else:
            skipped += 1
        
        if end_y != start_y and not (moves[-1]=='D' or moves[-1]=='U'):
            if start_y < end_y:
                moves.append('D')
                start_y += 1
            else:
                moves.append('U')
                start_y -= 1
        else:
            skipped += 1

        if skipped == 2: # unable to add a command, so must need a break
            moves.append('')

    return moves

def getColorChangeCommands(current_color, goal_color, prev_cmd):
    moves = []
    if (('R2' in prev_cmd) or ('L2' in prev_cmd)):
        # Moved color previous frame; need to skip a frame
        moves.append('')
    need = getColorDist(current_color, goal_color)
    if need > 0: # color right
        while need != 0:
            moves.append('R2')
            moves.append('')
            need -= 1
    else: # color left
        while need != 0:
            moves.append('L2')
            moves.append('')
            need += 1
    if len(moves) >= 2:
        moves.pop() # Remove trailing blank
    return moves

def mergeLists(list1, list2):
    return [" ".join(pair) for pair in zip(list1, list2)] + list1[len(list2):] + list2[len(list1):]

def processBlock(block, current_x, current_y, current_color, prev_cmd, direction):
    
    new_commands = []

    completed = []
    # White pixels are already done
    for x in range(block.shape[1]):
        for y in range(block.shape[0]):
            if block[y,x] == 16:
                completed.append((x,y))
    
    while len(completed) < (block.shape[0]*block.shape[1]):
        # Calculate command lengths for each pixel, finding the min
        potentials = {}
        for to_x in range(block.shape[1]):
            for to_y in range(block.shape[0]):
                if (to_x, to_y) in completed:
                    continue # already done this one
                # Calculate the required movement
                moves = getMoveCommands(current_x, current_y, to_x, to_y, prev_cmd)
                # Calculate the required color change
                color_changes = getColorChangeCommands(current_color, block[to_y,to_x], prev_cmd)

                # Merge the movement and color change.
                moves = mergeLists(moves, color_changes)

                # Handle A press
                # Check if was just holding A and need to again right now
                if (len(moves)==1) and ('A' in prev_cmd):
                    # If changing color, can't hold A
                    if ('R2' in moves[0]) or ('L2' in moves[0]):
                        # Add a blank frame
                        moves.append(moves[0])
                        moves[0] = ''
                moves[-1] += ' A'

                # Add sequence to potentials
                potentials[(to_x,to_y)] = moves

        # Find the shortest
        cmin = 5000
        cind = (-1, -1)
        for nind, ncmd in potentials.items():
            # Includes some hand-wavy heuristics
            if direction: # going left, prioritize right
                score = len(ncmd) - nind[0]/2
                if len(completed) < (block.shape[0]*block.shape[1])/2:
                    score += nind[1]/2
                if score <= cmin:
                    cind = nind
                    cmin = score
            else: # going right, prioritize left
                score = len(ncmd) + nind[0]/2
                if len(completed) < (block.shape[0]*block.shape[1])/2:
                    score -= nind[1]/2
                if score < cmin:
                    cind = nind
                    cmin = score
        # Mark pixel handled
        completed.append(cind)

        # Push commands
        current_color = block[cind[1],cind[0]]
        current_x = cind[0]
        current_y = cind[1]
        prev_cmd = potentials[cind][-1]
        new_commands.extend(potentials[cind])
    
    # Return resulting moves
    return current_x, current_y, current_color, new_commands

    
def main():
    # Load the image
    im = Image.open('BuilderMario.gif')
    pix = im.getdata();
    image = np.array(pix).reshape(180, 320)

    # Initialize position and color
    current_x, current_y, current_color = 0, 0, 0

    cmds = ['']
    prev_cmd = ''

    # Get the dimensions of the image
    columns = 320
    step_x = 16
    rows = 180
    step_y = 18

    totalPix = columns*rows
    perBlockPix = step_x*step_y
    donePix = 0

    going_left = False;
    # Loop over the blocks of pixels
    for row_start in range(0, rows, step_y):
        for column_start in range(0, columns, step_x):
            if going_left:
                column_start = columns - step_x - column_start
            block = image[row_start:row_start + step_y, column_start:column_start + step_x]
            current_x, current_y, current_color, newcmd = processBlock(block, current_x, current_y, current_color, prev_cmd, going_left)
            cmds.extend(newcmd)
            if len(newcmd) > 0:
                prev_cmd = newcmd[-1]
            # update the X position into the next block's local coordinate space
            if not going_left:
                current_x -= step_x
            else:
                current_x += step_x
            donePix += perBlockPix
            print(str(round(100*donePix/totalPix,2))+"%")

        # Next row; update Y position into next coordinate space
        current_y -= step_y
        # undo the previous X movement, since movement was straight down
        if going_left:
            current_x -= step_x
        else:
            current_x += step_x
        going_left = not going_left

    print(len(cmds))
    outstr = ""
    for cmd in cmds:
        outstr += "{"+cmd+"} 2\n"
    pyperclip.copy(outstr)


if __name__ == "__main__":
    main()
    #test()
