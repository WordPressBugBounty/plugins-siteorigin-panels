<?php
/*
Plugin Name: SiteOrigin Installer
Description: Streamline your WordPress setup with SiteOrigin's essential plugins and compatible themes in one go.
Version: 1.0.4
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.0.0
Author: SiteOrigin
Text Domain: siteorigin-installer-text-domain
Author URI: https://siteorigin.com
Plugin URI: https://siteorigin.com/installer/
Update URI: https://github.com/siteorigin/siteorigin-installer/
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html
*/

if ( ! defined( 'SITEORIGIN_INSTALLER_VERSION' ) ) {
	define( 'SITEORIGIN_INSTALLER_VERSION', '1.0.4' );
	define( 'SITEORIGIN_INSTALLER_DIR', plugin_dir_path( __FILE__ ) );
	define( 'SITEORIGIN_INSTALLER_URL', plugin_dir_url( __FILE__ ) );
}

if ( ! class_exists( 'SiteOrigin_Installer' ) ) {
	class SiteOrigin_Installer {
		public function __construct() {
			add_filter( 'siteorigin_premium_affiliate_id', array( $this, 'affiliate_id' ) );
			add_filter( 'init', array( $this, 'setup' ) );
			add_filter( 'siteorigin_add_installer', array( $this, 'load_status' ) );
			add_action( 'wp_ajax_so_installer_status', array( $this, 'installer_status_ajax' ) );
		}

		public static function single() {
			static $single;

			return empty( $single ) ? $single = new self() : $single;
		}

		public static function user_has_permission() {
			return (
				! defined( 'DISALLOW_FILE_MODS' ) ||
				! DISALLOW_FILE_MODS
			) &&
			current_user_can( 'install_plugins' ) &&
			current_user_can( 'install_themes' ) &&
			current_user_can( 'update_themes' ) &&
			current_user_can( 'update_plugins' );
		}

		public function setup() {
			if (
				apply_filters( 'siteorigin_add_installer', true ) &&
				is_admin() &&
				self::user_has_permission()
			) {
				/**
				 * Determine if the SiteOrigin Installer is a standalone plugin to conditionally load the updater.
				 * This prevents loading the updater when the Installer is bundled within another plugin.
				 */
				$plugin_basename = plugin_basename( __FILE__ );
				$is_standalone = (
					$plugin_basename === 'siteorigin-installer/siteorigin-installer.php' ||
					strpos( $plugin_basename, 'siteorigin-installer-' ) === 0
				);
				
				if ( $is_standalone ) {
					if ( file_exists( plugin_dir_path( __FILE__ ) . 'github-updater/updater.php' ) ) {
						require_once plugin_dir_path( __FILE__ ) . 'github-updater/updater.php';
						new SiteOrigin_Updater( __FILE__, 'siteorigin-installer', 'siteorigin/siteorigin-installer' );
					}
				}

				require_once __DIR__ . '/inc/admin.php';
			}
		}

		/**
		 * Get the Affiliate ID from the database.
		 *
		 * @return mixed|void
		 */
		public function affiliate_id( $id ) {
			if ( get_option( 'siteorigin_premium_affiliate_id' ) ) {
				$id = get_option( 'siteorigin_premium_affiliate_id' );
			}

			return $id;
		}

		public function load_status() {
			return (bool) get_option( 'siteorigin_installer', true );
		}

		public function installer_status_ajax () {
			check_ajax_referer( 'siteorigin_installer_status', 'nonce' );
			update_option( 'siteorigin_installer', rest_sanitize_boolean( $_POST['status'] ) );
			die();
		}
	}
}
SiteOrigin_Installer::single();
