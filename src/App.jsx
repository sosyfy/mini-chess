import { useRef, useState } from 'react';
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function App() {
  const [game, setGame] = useState(new Chess());
  const chessboardRef = useRef(null);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState({});


  function makeRandomMove() {
    const possibleMoves = game.moves();
    if (game.isGameOver() || game.isDraw() || possibleMoves.length === 0)
      return;

    const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    game.move(possibleMoves[randomIndex]);

    // Update the chessboard position after making a move
    // chessboardRef.current.setPosition(game.fen());

    const gameCopy = new Chess(game.fen());

    setGame(gameCopy)
  }

  function onDrop(sourceSquare, targetSquare, piece) {
    const gameCopy = new Chess(game.fen());

    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1]?.toLowerCase() ?? "q",
    });

    if (move === null) return false;

    validateGame(gameCopy)
    setGame(gameCopy);
    // Delay the computer's move by using setTimeout
    // setTimeout(makeRandomMove, 200);

    return true;
  }

  function getMoveOptions(square) {
    const moves = game.moves({
      square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
            game.get(move.to).color !== game.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }



  function onSquareClick(square) {
    setRightClickedSquares({});

    console.log("moveFrom: ", moveFrom);

    // from square
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }


    // to square
    if (!moveTo) {
      // check if valid move before showing dialog
      const moves = game.moves({
        moveFrom,
        verbose: true,
      });

      const foundMove = moves.find(
        (m) => m.from === moveFrom && m.to === square
      );


      // not a valid move
      if (!foundMove) {
        // check if clicked on new piece
        const hasMoveOptions = getMoveOptions(square);
        // if new piece, setMoveFrom, otherwise clear moveFrom
        setMoveFrom(hasMoveOptions ? square : "");
        return;
      }

      // valid move
      setMoveTo(square);

      // if promotion move
      if (
        (foundMove.color === "w" &&
          foundMove.piece === "p" &&
          square[1] === "8") ||
        (foundMove.color === "b" &&
          foundMove.piece === "p" &&
          square[1] === "1")
      ) {
        setShowPromotionDialog(true);
        setMoveFrom(moveFrom)
        // setMoveTo(moveTo)
        return;
      }

      // is normal move
      const gameCopy = game;
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      // if invalid, setMoveFrom and getMoveOptions
      if (move === null) {
        const hasMoveOptions = getMoveOptions(square);
        if (hasMoveOptions) setMoveFrom(square);
        return;
      }
      validateGame(gameCopy)

      setGame(gameCopy);
      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      return;
    }
  }


  function onSquareRightClick(square) {
    const color = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
          rightClickedSquares[square].backgroundColor === color
          ? undefined
          : { backgroundColor: color },
    });
  }


  function onPromotionPieceSelect(piece) {

    console.log(moveFrom, moveTo);
    // if no piece passed then user has cancelled dialog,
    // don't make move and reset
    if (piece) {
      const gameCopy = game; // Use spread operator or any other method to create a copy of game object

      gameCopy.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece.charAt(1).toLowerCase() ?? "q",
      });
      validateGame(gameCopy)
      setGame(gameCopy);
    }

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
    setOptionSquares({});

    return true;
  }


  function dragHandler(square) {
    setMoveTo(square)
  }


  function dragStartHandler(_, sourceSquare) {
    setMoveFrom(sourceSquare)
  }


  function validateGame(game) {
    const isCheck = game.inCheck();
    const isCheckmate = game.isCheckmate();
    const isStalemate = game.isStalemate();
    const isDraw = game.isDraw();
    const hasInsufficientMaterial = game.isInsufficientMaterial();

    if (isCheck) {
      console.log("In check!");
      // Perform actions or handle UI updates for being in check
      // For example, change cell colors or display a message
    }

    if (isCheckmate) {
      console.log("Checkmate!");
      // Perform actions or handle UI updates for checkmate
    }

    if (isStalemate) {
      console.log("Stalemate!");
      // Perform actions or handle UI updates for stalemate
    }

    if (isDraw || hasInsufficientMaterial) {
      console.log("Draw or Insufficient Material!");
      // Perform actions or handle UI updates for draw/insufficient material
    }
  }

  return (
    <div>
      <Chessboard
        id="PremovesEnabled"
        position={game.fen()}
        onPieceDrop={onDrop}
        onSquareClick={onSquareClick}
        onSquareRightClick={onSquareRightClick}
        onPieceDragBegin={dragStartHandler}
        onDragOverSquare={dragHandler}
        onPromotionPieceSelect={onPromotionPieceSelect}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0,0,0,.5)",
        }}
        customSquareStyles={{
          ...moveSquares,
          ...optionSquares,
          ...rightClickedSquares,
        }}

        promotionToSquare={moveTo}
        showPromotionDialog={showPromotionDialog}
        ref={chessboardRef}
      />
    </div>
  );
}