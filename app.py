#!/usr/bin/env python3
"""
ImageUnity - Image processing web application for LoRA training preparation.
"""

import argparse
import os
import sys
from server import create_app


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='ImageUnity - Process images for LoRA training',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python app.py --dir ./images
  python app.py --dir ./images --trash ./trash
  python app.py --dir ./images --host 0.0.0.0 --port 8080
  python app.py --dir ./images --copy  # Non-destructive mode
        '''
    )
    
    parser.add_argument(
        '--dir', '-d',
        required=True,
        help='Directory containing images to process'
    )
    
    parser.add_argument(
        '--trash', '-t',
        default=None,
        help='Optional trash directory for deleted images'
    )
    
    parser.add_argument(
        '--host', '-H',
        default='127.0.0.1',
        help='Host to bind (default: 127.0.0.1, use 0.0.0.0 for all interfaces)'
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=5000,
        help='Port to listen on (default: 5000)'
    )
    
    parser.add_argument(
        '--copy', '-c',
        action='store_true',
        help='Non-destructive mode: save as copies instead of overwriting'
    )
    
    return parser.parse_args()


def validate_directories(args):
    """Validate that required directories exist."""
    # Check image directory
    if not os.path.isdir(args.dir):
        print(f"Error: Image directory does not exist: {args.dir}", file=sys.stderr)
        sys.exit(1)
    
    # Check trash directory if specified
    if args.trash:
        if not os.path.isdir(args.trash):
            print(f"Error: Trash directory does not exist: {args.trash}", file=sys.stderr)
            sys.exit(1)


def main():
    """Main entry point."""
    args = parse_args()
    validate_directories(args)
    
    # Convert to absolute paths
    image_dir = os.path.abspath(args.dir)
    trash_dir = os.path.abspath(args.trash) if args.trash else None
    
    print(f"ImageUnity starting...")
    print(f"  Image directory: {image_dir}")
    if trash_dir:
        print(f"  Trash directory: {trash_dir}")
    print(f"  Mode: {'Copy (non-destructive)' if args.copy else 'Destructive (overwrite)'}")
    print(f"  Server: http://{args.host}:{args.port}")
    print()
    
    # Create and run the Flask app
    app = create_app(
        image_dir=image_dir,
        trash_dir=trash_dir,
        copy_mode=args.copy
    )
    
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == '__main__':
    main()
