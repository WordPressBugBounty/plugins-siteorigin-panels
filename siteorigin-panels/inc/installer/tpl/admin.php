<div class="wrap siteorigin-installer-wrap">
	<div class="siteorigin-installer-header">
		<h1 class="siteorigin-logo">
			<img src="<?php echo esc_url( plugin_dir_url( __FILE__ ) ) . '../img/siteorigin.svg'; ?>" />
			<?php esc_html_e( 'SiteOrigin Installer', 'siteorigin-panels' ); ?>
		</h1>

		<ul class="page-sections">
			<li><a href="#" data-section="plugins"><?php esc_html_e( 'Plugins', 'siteorigin-panels' ); ?></a></li>
			<li><a href="#" data-section="themes"><?php esc_html_e( 'Themes', 'siteorigin-panels' ); ?></a></li>
			<li class="active-section"><a href="#" data-section="all"><?php esc_html_e( 'All', 'siteorigin-panels' ); ?></a></li>
		</ul>
	</div>

	<ul class="siteorigin-products">
		<?php
		foreach ( $products as $slug => $item ) {
			$classes = array();
			$classes[] = $slug == 'siteorigin-premium' || empty( $item['status'] ) ? 'active' : 'inactive';

			if ( ! empty( $highlight ) && $slug == $highlight ) {
				$classes[] = 'highlight-item';
			}
			?>
			<li class="siteorigin-installer-item siteorigin-<?php echo esc_attr( $item['type'] ); ?> siteorigin-installer-item-<?php echo sanitize_html_class( implode( ' ', $classes ) ); ?>">
				<div
					class="siteorigin-installer-item-body"
					data-slug="<?php echo esc_attr( $slug ); ?>"
					data-version="<?php echo esc_attr( $item['version'] ); ?>"
				>
					<?php if ( ! empty( $item['screenshot'] ) ) { ?>
						<img class="siteorigin-installer-item-banner" src="<?php echo esc_url( $item['screenshot'] ); ?>" />
					<?php } ?>

					<div class="siteorigin-product-content">

						<h3>
							<?php echo esc_html( $item['name'] ); ?>
						</h3>
						<p class="so-description">
							<?php
							if ( ! empty( $highlight ) && $slug == $highlight ) {
								echo '<span class="siteorigin-required">';
								printf(
									esc_html__( 'Required %s', 'siteorigin-panels' ),
									$item['type'] == 'plugins' ? esc_html__( 'Plugin', 'siteorigin-panels' ) : esc_html__( 'Theme', 'siteorigin-panels' )
								);
								echo '</span>';
							}
							echo esc_html( $item['description'] );
							?>
						</p>

						<div class="so-type-indicator">
							<?php
							if ( $item['type'] == 'plugins' ) {
								esc_html_e( 'Plugin', 'siteorigin-panels' );
							} else {
								esc_html_e( 'Theme', 'siteorigin-panels' );
							}
							?>
						</div>

						<div class="so-buttons <?php
						echo $slug != 'siteorigin-premium' && ! empty( $item['status'] ) && ! empty( $item['update'] ) ? 'so-buttons-force-wrap' : ''; ?>">
							<?php
							if (
								$slug == 'siteorigin-premium' ||
								! empty( $item['status'] ) ||
								! empty( $item['update'] ) ||
								$item['type'] == 'themes'
							) {
								$text = '';
								if ( ! empty( $item['status'] ) || $item['type'] == 'themes' ) {
									if ( $item['status'] == 'install' ) {


										if ( $slug == 'siteorigin-premium' ) {
											$premium_url = 'https://siteorigin.com/downloads/premium/';
											$affiliate_id = apply_filters( 'siteorigin_premium_affiliate_id', '' );
											if ( $affiliate_id && is_numeric( $affiliate_id ) ) {
												$premium_url = add_query_arg( 'ref', urlencode( $affiliate_id ), $premium_url );
											}
											?>
											<a href="<?php echo esc_url( $premium_url ); ?>" target="_blank" rel="noopener noreferrer" class="button-primary">
												<?php esc_html_e( 'Get SiteOrigin Premium', 'siteorigin-panels' ); ?>
											</a>
											<?php
										} else {

										$text = __( 'Install', 'siteorigin-panels' );
										}
									} else {
										$text = __( 'Activate', 'siteorigin-panels' );
									}

									if ( ! empty( $text ) ) {
										require 'action-btn.php';
									}
								}

								if ( ! empty( $item['update'] ) ) {
									$text = __( 'Update', 'siteorigin-panels' );
									$item['status'] = 'update';
									require 'action-btn.php';
								}
							}


							if (
								$item['type'] == 'themes' &&
								! empty( $item['demo'] )
							) {
								?>
								<a href="<?php echo esc_url( $item['demo'] ); ?>" target="_blank" rel="noopener noreferrer" class="siteorigin-demo">
									<?php esc_html_e( 'Demo', 'siteorigin-panels' ); ?>
								</a>
							<?php } ?>

							<?php if ( ! empty( $item['documentation'] ) ) { ?>
								<a href="<?php echo esc_url( $item['documentation'] ); ?>" target="_blank" rel="noopener noreferrer" class="siteorigin-docs">
									<?php esc_html_e( 'Documentation', 'siteorigin-panels' ); ?>
								</a>
							<?php } ?>
						</div>
					</div>
				</div>
			</li>
			<?php
		}
		?>
	</ul>

</div>
